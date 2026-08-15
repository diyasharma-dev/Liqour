(function () {
  'use strict';

  /* ---------- Storage helpers ---------- */
  var USERS_KEY = 'liquor46_users';
  var SESSION_KEY = 'liquor46_session';
  var CART_KEY = 'liquor46_cart';
  var FREE_DELIVERY = 75;
  var TAX_RATE = 0.07;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PHONE_RE = /^[\d\s()+.-]{7,}$/;
  var PROMOS = { LIQUOR46: 0.10, WELCOME10: 0.10 };

  function readLS(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function writeLS(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function readSS(key) {
    try { return JSON.parse(sessionStorage.getItem(key)); } catch (e) { return null; }
  }
  function writeSS(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function removeKey(key) {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch (e) {}
  }

  function money(n) {
    return '$' + (Math.round(n * 100) / 100).toFixed(2);
  }

  /* ---------- Toast ---------- */
  function toast(message) {
    var t = document.querySelector('.l46-toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'l46-toast';
      document.body.appendChild(t);
    }
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  /* ---------- Cart ---------- */
  function getCart() {
    var cart = readLS(CART_KEY);
    return Array.isArray(cart) ? cart : [];
  }
  function saveCart(cart) {
    writeLS(CART_KEY, cart);
  }
  function cartCount() {
    return getCart().reduce(function (n, it) { return n + (it.qty || 0); }, 0);
  }
  function updateBadges() {
    var n = cartCount();
    var label = n === 1 ? '1' : String(n);
    document.querySelectorAll('.cart-count').forEach(function (el) {
      el.textContent = label;
    });
  }

  function slugify(text) {
    return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function initialsFromName(name) {
    var parts = String(name).split(/\s+/).filter(Boolean);
    return ((parts[0] ? parts[0][0] : '') + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  function productFromCard(card) {
    var nameEl = card.querySelector('.p-name');
    var priceEl = card.querySelector('.price');
    var metaEl = card.querySelector('.p-meta');
    var media = card.querySelector('.p-media');
    var name = nameEl ? nameEl.textContent.trim() : '';
    var priceText = priceEl ? priceEl.textContent.trim() : '0';
    var price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
    var tile = 'tile-more';
    if (media) {
      if (media.classList.contains('tile-wine')) tile = 'tile-wine';
      else if (media.classList.contains('tile-spirits')) tile = 'tile-spirits';
      else if (media.classList.contains('tile-beer')) tile = 'tile-beer';
    }
    return {
      id: slugify(name) || ('item-' + Math.random().toString(36).slice(2, 9)),
      name: name,
      price: price,
      meta: metaEl ? metaEl.textContent.trim() : '',
      tile: tile
    };
  }

  function packagesPerMeta(meta) {
    var m = meta.match(/(\d+)\s*[x\u00d7]\s*\d+/);
    if (m) return parseInt(m[1], 10);
    var p = meta.match(/(\d+)\s*-pack/i);
    if (p) return parseInt(p[1], 10);
    return 1;
  }

  function addToCart(product, qty) {
    var cart = getCart();
    var existing = null;
    cart.forEach(function (it) { if (it.id === product.id) existing = it; });
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ id: product.id, name: product.name, price: product.price, meta: product.meta, tile: product.tile, qty: qty });
    }
    saveCart(cart);
    updateBadges();
    toast(product.name + ' added to cart.');
  }

  function removeFromCart(id) {
    saveCart(getCart().filter(function (it) { return it.id !== id; }));
    updateBadges();
    renderCart();
    toast('Removed from cart.');
  }

  function changeQty(id, qty) {
    var cart = getCart();
    var found = false;
    cart.forEach(function (it) {
      if (it.id === id) {
        if (qty <= 0) {
          found = true;
        } else {
          it.qty = qty;
        }
      }
    });
    if (qty <= 0) saveCart(cart.filter(function (it) { return it.id !== id; }));
    else saveCart(cart);
    updateBadges();
    renderCart();
  }

  function cartItemNode(it) {
    var wrap = document.createElement('div');
    wrap.className = 'cart-item';
    wrap.setAttribute('data-id', it.id);

    var thumb = document.createElement('div');
    thumb.className = 'cart-thumb ' + (it.tile || 'tile-more');
    thumb.textContent = initialsFromName(it.name);

    var info = document.createElement('div');
    var name = document.createElement('div');
    name.className = 'ci-name';
    name.textContent = it.name;
    var meta = document.createElement('div');
    meta.className = 'ci-meta';
    meta.textContent = (it.meta ? it.meta + ' \u00b7 ' : '') + money(it.price) + ' each';
    var rm = document.createElement('a');
    rm.className = 'ci-remove';
    rm.href = '#';
    rm.textContent = 'Remove';
    rm.addEventListener('click', function (e) {
      e.preventDefault();
      removeFromCart(it.id);
    });
    info.appendChild(name);
    info.appendChild(meta);
    info.appendChild(rm);

    var qty = document.createElement('div');
    qty.className = 'qty';
    var dec = document.createElement('button');
    dec.type = 'button';
    dec.setAttribute('aria-label', 'Decrease quantity');
    dec.textContent = '\u2212';
    var val = document.createElement('span');
    val.className = 'qty-val';
    val.textContent = String(it.qty);
    var inc = document.createElement('button');
    inc.type = 'button';
    inc.setAttribute('aria-label', 'Increase quantity');
    inc.textContent = '+';
    qty.appendChild(dec);
    qty.appendChild(val);
    qty.appendChild(inc);

    dec.addEventListener('click', function () { changeQty(it.id, it.qty - 1); });
    inc.addEventListener('click', function () { changeQty(it.id, it.qty + 1); });

    var total = document.createElement('div');
    total.className = 'ci-total';
    total.textContent = money(it.qty * it.price);

    wrap.appendChild(thumb);
    wrap.appendChild(info);
    wrap.appendChild(qty);
    wrap.appendChild(total);
    return wrap;
  }

  var promo = null;

  function renderSummary(subtotal) {
    var discount = promo ? Math.round(subtotal * promo.rate * 100) / 100 : 0;
    var tax = Math.round(subtotal * TAX_RATE * 100) / 100;

    var el = document.getElementById('sum-subtotal');
    if (el) el.textContent = money(subtotal);

    el = document.getElementById('sum-discount');
    if (el) {
      el.style.display = discount > 0 ? '' : 'none';
      if (discount > 0 && promo) {
        var lab = el.querySelector('.sum-discount-label');
        var v = el.querySelector('.sum-discount-val');
        if (lab) lab.textContent = 'Discount (' + promo.code + ')';
        if (v) v.textContent = '\u2212' + money(discount);
      }
    }

    el = document.getElementById('sum-tax');
    if (el) el.textContent = money(tax);

    el = document.getElementById('sum-total');
    if (el) el.textContent = money(subtotal + tax - discount);

    el = document.getElementById('sum-notice');
    if (el) {
      var remain = Math.round((FREE_DELIVERY - subtotal) * 100) / 100;
      el.textContent = remain > 0
        ? 'Add ' + money(remain) + ' more for free local delivery.'
        : 'You\u2019ve unlocked free local delivery within 5 miles.';
    }
  }

  function renderCart() {
    var itemsEl = document.getElementById('cart-items');
    if (!itemsEl) return;

    var cart = getCart();
    var emptyEl = document.getElementById('cart-empty');
    var labelEl = document.getElementById('cart-count-label');
    var summaryEl = document.querySelector('.summary-card');

    itemsEl.innerHTML = '';

    if (!cart.length) {
      if (labelEl) labelEl.textContent = '0 items';
      if (emptyEl) emptyEl.hidden = false;
      if (summaryEl) summaryEl.style.display = 'none';
      renderSummary(0);
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    if (summaryEl) summaryEl.style.display = '';

    var count = 0;
    var subtotal = 0;
    cart.forEach(function (it) {
      count += it.qty;
      subtotal += it.qty * it.price;
      itemsEl.appendChild(cartItemNode(it));
    });

    if (labelEl) labelEl.textContent = count + (count === 1 ? ' item' : ' items');
    renderSummary(subtotal);
  }

  function initPromo() {
    var input = document.getElementById('promo-code');
    var apply = document.getElementById('promo-apply');
    var msg = document.getElementById('promo-msg');
    if (!input || !apply) return;

    apply.addEventListener('click', function () {
      if (promo) {
        promo = null;
        if (msg) { msg.hidden = true; msg.textContent = ''; }
        toast('Promo code removed.');
        renderSummary(getCart().reduce(function (n, it) { return n + it.qty * it.price; }, 0));
        return;
      }
      var code = input.value.trim().toUpperCase();
      if (!code) {
        if (msg) { msg.hidden = false; msg.className = 'notice warn'; msg.textContent = 'Enter a promo code to apply it.'; }
        return;
      }
      if (PROMOS[code]) {
        promo = { code: code, rate: PROMOS[code] };
        if (msg) { msg.hidden = false; msg.className = 'notice ok'; msg.textContent = 'Promo applied \u2014 ' + code + ' saves 10% on this order.'; }
        toast('Promo code ' + code + ' applied.');
        renderSummary(getCart().reduce(function (n, it) { return n + it.qty * it.price; }, 0));
      } else {
        if (msg) { msg.hidden = false; msg.className = 'notice warn'; msg.textContent = 'That promo code is not valid.'; }
      }
    });
  }

  function initCartPage() {
    renderCart();
    initPromo();
  }

  /* ---------- Add to cart (product cards) ---------- */
  document.addEventListener('click', function (e) {
    var anchor = e.target.closest ? e.target.closest('a') : null;
    if (!anchor) return;
    var card = anchor.closest('.p-card');
    if (!card) return;
    var text = anchor.textContent.trim().toLowerCase();
    if (text.indexOf('add to cart') !== 0 && text.indexOf('add a case') !== 0) return;

    e.preventDefault();
    var product = productFromCard(card);
    if (text.indexOf('add a case') === 0) {
      var m = anchor.textContent.match(/\((\d+)\)/);
      var bottles = m ? parseInt(m[1], 10) : 12;
      var per = packagesPerMeta(product.meta);
      addToCart(product, Math.max(1, Math.round(bottles / per)));
    } else {
      addToCart(product, 1);
    }
  });

  /* ---------- Account ---------- */
  function getUsers() {
    var users = readLS(USERS_KEY);
    return Array.isArray(users) ? users : [];
  }
  function findUser(email) {
    var wanted = email.trim().toLowerCase();
    return getUsers().filter(function (u) { return u.email.toLowerCase() === wanted; })[0] || null;
  }
  function saveUser(user) {
    var list = getUsers();
    list.push(user);
    writeLS(USERS_KEY, list);
  }

  function getSession() {
    return readLS(SESSION_KEY) || readSS(SESSION_KEY) || null;
  }
  function setSession(user, keep) {
    removeKey(SESSION_KEY);
    var data = { email: user.email.toLowerCase(), first: user.first, last: user.last, phone: user.phone || '' };
    if (keep) writeLS(SESSION_KEY, data);
    else writeSS(SESSION_KEY, data);
  }

  function updateHeaderAuth() {
    var session = getSession();
    document.querySelectorAll('.header-actions a.action[href="account.html"]').forEach(function (a) {
      var svg = a.querySelector('svg.icon');
      while (a.firstChild) a.removeChild(a.firstChild);
      if (svg) a.appendChild(svg);
      a.appendChild(document.createTextNode(session ? ' Hi, ' + session.first : ' Account'));
      a.title = session ? 'Signed in as ' + session.email : '';
    });
  }

  function showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  function clearFormErrors(form) {
    form.querySelectorAll('.invalid').forEach(function (el) { el.classList.remove('invalid'); });
    form.querySelectorAll('.notice.warn').forEach(function (el) { el.hidden = true; });
  }

  function showDashboard(user, created) {
    var tabs = document.getElementById('auth-tabs');
    var dash = document.getElementById('auth-dashboard');
    if (tabs) tabs.style.display = 'none';
    if (dash) {
      dash.style.display = 'block';
      var nameEl = document.getElementById('auth-name');
      var emailEl = document.getElementById('auth-email');
      var avatar = document.getElementById('auth-avatar');
      var flash = document.getElementById('auth-flash');
      if (nameEl) nameEl.textContent = 'Hello, ' + user.first + '!';
      if (emailEl) emailEl.textContent = user.email;
      if (avatar) avatar.textContent = initialsFromName(user.first + ' ' + user.last);
      if (flash) flash.textContent = created
        ? 'Your account was created and you\u2019re signed in.'
        : 'Signed in. Track orders, earn rewards, and get allocation alerts.';
    }
    updateHeaderAuth();
  }

  function onSignin(e) {
    e.preventDefault();
    var form = e.target;
    clearFormErrors(form);
    var emailEl = document.getElementById('ac-email');
    var passEl = document.getElementById('ac-pass');
    var keepEl = document.getElementById('auth-keep');
    var errEl = document.getElementById('auth-err');

    var email = emailEl ? emailEl.value.trim() : '';
    var pass = passEl ? passEl.value : '';
    var errors = [];
    if (!email) errors.push('Enter your email address.');
    else if (!EMAIL_RE.test(email)) errors.push('Enter a valid email address.');
    if (!pass) errors.push('Enter your password.');
    if (errors.length) {
      showError(errEl, errors.join(' '));
      if (emailEl && !email) emailEl.classList.add('invalid');
      if (passEl && !pass) passEl.classList.add('invalid');
      return;
    }
    var user = findUser(email);
    if (!user || user.pass !== pass) {
      showError(errEl, 'We couldn\u2019t find a matching account. Check your email and password, or create an account.');
      if (emailEl) emailEl.classList.add('invalid');
      return;
    }
    setSession(user, !!(keepEl && keepEl.checked));
    showDashboard(user, false);
    toast('Welcome back, ' + user.first + '!');
  }

  function onRegister(e) {
    e.preventDefault();
    var form = e.target;
    clearFormErrors(form);
    var firstEl = document.getElementById('ac-first');
    var lastEl = document.getElementById('ac-last');
    var emailEl = document.getElementById('ac-reg-email');
    var phoneEl = document.getElementById('ac-phone');
    var passEl = document.getElementById('ac-pass-new');
    var confirmEl = document.getElementById('ac-pass-confirm');
    var ageEl = document.getElementById('reg-age');
    var errEl = document.getElementById('reg-err');

    var first = firstEl ? firstEl.value.trim() : '';
    var last = lastEl ? lastEl.value.trim() : '';
    var email = emailEl ? emailEl.value.trim() : '';
    var phone = phoneEl ? phoneEl.value.trim() : '';
    var pass = passEl ? passEl.value : '';
    var confirm = confirmEl ? confirmEl.value : '';

    var errors = [];
    if (!first) errors.push('First name is required.');
    if (!last) errors.push('Last name is required.');
    if (!email) errors.push('Email is required.');
    else if (!EMAIL_RE.test(email)) errors.push('Enter a valid email address.');
    if (phone && !PHONE_RE.test(phone)) errors.push('Enter a valid phone number.');
    if (!pass) errors.push('Choose a password (at least 6 characters).');
    else if (pass.length < 6) errors.push('Password must be at least 6 characters.');
    if (!confirm) errors.push('Confirm your password.');
    else if (pass !== confirm) errors.push('Passwords do not match.');
    if (!(ageEl && ageEl.checked)) errors.push('You must confirm you are 21 or older to create an account.');

    if (errors.length) {
      showError(errEl, errors.join(' '));
      if (firstEl && !first) firstEl.classList.add('invalid');
      if (lastEl && !last) lastEl.classList.add('invalid');
      if (emailEl && (!email || !EMAIL_RE.test(email))) emailEl.classList.add('invalid');
      if (phoneEl && phone && !PHONE_RE.test(phone)) phoneEl.classList.add('invalid');
      if (passEl && (!pass || pass.length < 6)) passEl.classList.add('invalid');
      if (confirmEl && confirm !== pass) confirmEl.classList.add('invalid');
      return;
    }

    if (findUser(email)) {
      showError(errEl, 'That email is already registered. Sign in instead.');
      if (emailEl) emailEl.classList.add('invalid');
      return;
    }

    var user = { first: first, last: last, email: email.toLowerCase(), phone: phone, pass: pass, created: Date.now() };
    saveUser(user);
    setSession(user, true);
    showDashboard(user, true);
    toast('Welcome to Liquor 46, ' + first + '!');
  }

  function signOut() {
    removeKey(SESSION_KEY);
    var dash = document.getElementById('auth-dashboard');
    var tabs = document.getElementById('auth-tabs');
    if (dash) dash.style.display = 'none';
    if (tabs) tabs.style.display = '';
    var signinRadio = document.getElementById('tab-signin');
    if (signinRadio) signinRadio.checked = true;
    var signin = document.getElementById('auth-signin');
    var register = document.getElementById('auth-register');
    if (signin) signin.reset();
    if (register) register.reset();
    updateHeaderAuth();
    toast('Signed out.');
  }

  function initAccountPage() {
    var signin = document.getElementById('auth-signin');
    var register = document.getElementById('auth-register');
    var out = document.getElementById('auth-signout');
    if (signin) signin.addEventListener('submit', onSignin);
    if (register) register.addEventListener('submit', onRegister);
    if (out) out.addEventListener('click', signOut);
    if (getSession()) showDashboard(getSession(), false);
  }

  /* ---------- Newsletters ---------- */
  function initNewsletter() {
    document.querySelectorAll('.newsletter-form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = form.querySelector('input[type="email"]');
        var email = input ? input.value.trim() : '';
        if (!EMAIL_RE.test(email)) {
          if (input) input.focus();
          toast('Please enter a valid email address.');
          return;
        }
        form.innerHTML = '';
        var p = document.createElement('p');
        p.className = 'newsletter-ok';
        p.textContent = 'Thanks \u2014 you\u2019re on the list! Check your inbox to confirm.';
        form.appendChild(p);
      });
    });
  }

  /* ---------- Contact & events forms ---------- */
  function markInvalid(input) {
    if (input) input.classList.add('invalid');
  }

  function wireForm(form, fields, onValid) {
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var errors = [];
      fields.forEach(function (f) {
        var el = form.querySelector('#' + f.id);
        var val = el ? el.value.trim() : '';
        if (f.required && !val) errors.push(f.label);
        else if (f.type === 'email' && val && !EMAIL_RE.test(val)) errors.push('Enter a valid email address.');
        else if (f.type === 'tel' && val && !PHONE_RE.test(val)) errors.push('Enter a valid phone number.');
      });
      if (errors.length) {
        fields.forEach(function (f) {
          var el = form.querySelector('#' + f.id);
          var val = el ? el.value.trim() : '';
          var bad = f.required && !val;
          if (f.type === 'email' && val && !EMAIL_RE.test(val)) bad = true;
          if (f.type === 'tel' && val && !PHONE_RE.test(val)) bad = true;
          markInvalid(el, bad);
        });
        toast(errors[0]);
        return;
      }
      onValid(form);
    });
  }

  function initContact() {
    var form = document.getElementById('contact-form');
    var success = document.getElementById('contact-success');
    wireForm(form, [
      { id: 'ct-name', label: 'Please add your name.', required: true },
      { id: 'ct-email', label: 'Please add your email address.', required: true, type: 'email' },
      { id: 'ct-phone', label: 'Please add a phone number.', type: 'tel' },
      { id: 'ct-msg', label: 'Please add a short message.', required: true }
    ], function () {
      form.style.display = 'none';
      if (success) success.hidden = false;
      toast('Message sent. Thanks!');
    });
  }

  function initEvents() {
    var form = document.getElementById('events-form');
    var success = document.getElementById('events-success');
    wireForm(form, [
      { id: 'ev-name', label: 'Please add your name.', required: true },
      { id: 'ev-email', label: 'Please add your email address.', required: true, type: 'email' },
      { id: 'ev-phone', label: 'Please add a phone number.', required: true, type: 'tel' },
      { id: 'ev-notes', label: 'Please add any notes or requests.', required: false }
    ], function () {
      form.style.display = 'none';
      if (success) success.hidden = false;
      toast('Reservation requested. We\u2019ll confirm by email.');
    });
  }

  function markInvalid(el, bad) {
    if (!el) return;
    if (bad) el.classList.add('invalid');
    else el.classList.remove('invalid');
  }

  /* ---------- Clear invalid states on typing ---------- */
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('invalid')) t.classList.remove('invalid');
  });

  /* ---------- Init ---------- */
  function init() {
    updateBadges();
    updateHeaderAuth();
    if (document.getElementById('cart-items')) initCartPage();
    if (document.getElementById('auth-signin') || document.getElementById('auth-dashboard')) initAccountPage();
    initNewsletter();
    if (document.getElementById('contact-form')) initContact();
    if (document.getElementById('events-form')) initEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
