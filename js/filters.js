/* ========================================================
   Liquor 46 — Filter Sidebar, Sorting & Product Slider
   Loaded after app.js. Does not modify existing JS.
   ======================================================== */
(function () {
  'use strict';

  /* ========================================================
     SECTION 1: FILTER SIDEBAR
     ======================================================== */

  /* --- Accordion toggle --- */
  function initFilterAccordions() {
    document.querySelectorAll('.fs-card-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var expanded = btn.getAttribute('aria-expanded') !== 'false';
        btn.setAttribute('aria-expanded', String(!expanded));
      });
    });
  }

  /* --- Mobile filter drawer --- */
  function initFilterDrawer() {
    var sidebar  = document.getElementById('filter-sidebar');
    var openBtn  = document.getElementById('filter-toggle-btn');
    var closeBtn = document.getElementById('filter-close-btn');
    var overlay  = document.getElementById('filter-drawer-overlay');
    if (!sidebar || !openBtn || !overlay) return;

    function openDrawer() {
      sidebar.classList.add('open');
      overlay.classList.add('active');
      overlay.classList.remove('closing');
      document.body.style.overflow = 'hidden';
      openBtn.setAttribute('aria-expanded', 'true');
    }

    function closeDrawer() {
      sidebar.classList.remove('open');
      overlay.classList.add('closing');
      document.body.style.overflow = '';
      openBtn.setAttribute('aria-expanded', 'false');
      setTimeout(function () { overlay.classList.remove('active', 'closing'); }, 300);
    }

    openBtn.addEventListener('click', function () {
      sidebar.classList.contains('open') ? closeDrawer() : openDrawer();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) closeDrawer();
    });
  }

  /* --- Filter & Sort engine --- */
  function initFilterEngine() {
    var sidebar = document.getElementById('filter-sidebar');
    if (!sidebar) return;

    /* DOM elements */
    var countEl     = document.getElementById('shop-product-count');
    var statusEl    = document.getElementById('filter-status');
    var sortEl      = document.getElementById('shop-sort-select');
    var resetBtn    = document.getElementById('fs-reset');
    var resetInline = document.getElementById('fs-reset-inline');
    var priceSlider = document.getElementById('fs-price-slider');
    var priceMinEl  = document.getElementById('fs-price-min');
    var priceMaxEl  = document.getElementById('fs-price-max');
    var priceApply  = document.getElementById('fs-price-apply');

    /* All filterable product cards */
    var allCards = Array.prototype.slice.call(
      document.querySelectorAll('.p-card[data-category]')
    );
    var totalCount = allCards.length;

    /* ── Checkbox groups ── */
    var catChecks        = sidebar.querySelectorAll('[data-filter-group="category"] .fs-option input');
    var availChecks      = sidebar.querySelectorAll('[data-filter-group="availability"] .fs-option input');
    var brandChecks      = sidebar.querySelectorAll('[data-filter-group="brand"] .fs-option input');
    var sizeChecks       = sidebar.querySelectorAll('[data-filter-group="size"] .fs-option input');
    var collectionChecks = sidebar.querySelectorAll('[data-filter-group="collections"] .fs-option input');
    /* NEW filter groups */
    var typeChecks       = sidebar.querySelectorAll('[data-filter-group="type"] .fs-option input');
    var styleChecks      = sidebar.querySelectorAll('[data-filter-group="style"] .fs-option input');
    var countryChecks    = sidebar.querySelectorAll('[data-filter-group="country"] .fs-option input');
    var ageChecks        = sidebar.querySelectorAll('[data-filter-group="age"] .fs-option input');
    var ratingChecks     = sidebar.querySelectorAll('[data-filter-group="rating"] .fs-option input');

    /* ── Dynamic price range ── */
    var maxPriceInData = 0;
    allCards.forEach(function (c) {
      var p = parseFloat(c.getAttribute('data-price')) || 0;
      if (p > maxPriceInData) maxPriceInData = p;
    });
    maxPriceInData = Math.ceil(maxPriceInData / 10) * 10 || 200;

    if (priceSlider) { priceSlider.max = maxPriceInData; priceSlider.value = maxPriceInData; }
    if (priceMaxEl)  { priceMaxEl.max = maxPriceInData;  priceMaxEl.value  = maxPriceInData;  priceMaxEl.placeholder = '$' + maxPriceInData; }
    if (priceMinEl)  { priceMinEl.max = maxPriceInData; }

    /* ── Filter state ── */
    var state = {
      categories:   [],
      availability: [],
      brands:       [],
      sizes:        [],
      collections:  [],
      types:        [],   /* wine type / spirit type / mixer type */
      styles:       [],   /* beer style */
      countries:    [],   /* country of origin */
      ages:         [],   /* age statement for spirits */
      ratings:      [],   /* rating tiers: "4.0", "4.5", "4.8" */
      priceMin:     0,
      priceMax:     maxPriceInData,
      sort:         'best-selling'
    };

    /* ── Data accessors ── */
    function getCat(c)         { return (c.getAttribute('data-category')   || '').toLowerCase(); }
    function getPrice(c)       { return parseFloat(c.getAttribute('data-price'))   || 0; }
    function getStock(c)       { return (c.getAttribute('data-stock')      || '').toLowerCase(); }
    function getBrand(c)       { return (c.getAttribute('data-brand')      || '').toLowerCase(); }
    function getSize(c)        { return (c.getAttribute('data-size')       || '').toLowerCase(); }
    function getCollections(c) { return (c.getAttribute('data-collection') || '').toLowerCase(); }
    function getRating(c)      { return parseFloat(c.getAttribute('data-rating'))  || 0; }
    function getNewest(c)      { return parseInt(c.getAttribute('data-newest') || '0', 10) || 0; }
    function getType(c)        { return (c.getAttribute('data-type')       || '').toLowerCase(); }
    function getStyle(c)       { return (c.getAttribute('data-style')      || '').toLowerCase(); }
    function getCountry(c)     { return (c.getAttribute('data-country')    || '').toLowerCase(); }
    function getAge(c)         { return (c.getAttribute('data-age')        || '').toLowerCase(); }
    function getName(c) {
      var attr = c.getAttribute('data-name');
      if (attr) return attr.toLowerCase();
      var el = c.querySelector('.p-name');
      return el ? el.textContent.trim().toLowerCase() : '';
    }

    /* Rating tier helper — maps a numeric rating to a tier key */
    function getRatingTier(c) {
      var r = getRating(c);
      if (r >= 4.8) return '4.8';
      if (r >= 4.5) return '4.5';
      if (r >= 4.0) return '4.0';
      return '';
    }

    /* ── Active filter count ── */
    function countActiveFilters() {
      var n = 0;
      if (state.categories.length)   n++;
      if (state.availability.length) n++;
      if (state.brands.length)       n++;
      if (state.sizes.length)        n++;
      if (state.collections.length)  n++;
      if (state.types.length)        n++;
      if (state.styles.length)       n++;
      if (state.countries.length)    n++;
      if (state.ages.length)         n++;
      if (state.ratings.length)      n++;
      if (state.priceMin > 0 || state.priceMax < maxPriceInData) n++;
      return n;
    }

    /* ── Status pill ── */
    function updateStatusPill(visibleCount) {
      if (!statusEl) return;
      var n = countActiveFilters();
      if (n === 0) {
        statusEl.textContent = visibleCount + ' of ' + totalCount + ' products';
        statusEl.classList.remove('has-filters');
      } else {
        statusEl.textContent = visibleCount + ' of ' + totalCount +
          (n === 1 ? ' \u2014 1 filter' : ' \u2014 ' + n + ' filters');
        statusEl.classList.add('has-filters');
      }
    }

    /* ── Apply filters ── */
    function applyFilters() {
      var visibleCount = 0;

      allCards.forEach(function (card) {
        var show = true;

        /* Category */
        if (state.categories.length && state.categories.indexOf(getCat(card)) === -1) show = false;

        /* Price */
        if (show) {
          var price = getPrice(card);
          if (price < state.priceMin || price > state.priceMax) show = false;
        }

        /* Availability */
        if (show && state.availability.length && state.availability.indexOf(getStock(card)) === -1) show = false;

        /* Brand */
        if (show && state.brands.length && state.brands.indexOf(getBrand(card)) === -1) show = false;

        /* Size */
        if (show && state.sizes.length && state.sizes.indexOf(getSize(card)) === -1) show = false;

        /* Collections — OR logic (card matches if it has ANY selected token) */
        if (show && state.collections.length) {
          var cardCols = getCollections(card).split(/\s+/).filter(Boolean);
          var matched = false;
          for (var i = 0; i < state.collections.length; i++) {
            if (cardCols.indexOf(state.collections[i]) !== -1) { matched = true; break; }
          }
          if (!matched) show = false;
        }

        /* Type (wine type / spirit type / mixer type) */
        if (show && state.types.length && state.types.indexOf(getType(card)) === -1) show = false;

        /* Style (beer style) */
        if (show && state.styles.length && state.styles.indexOf(getStyle(card)) === -1) show = false;

        /* Country */
        if (show && state.countries.length && state.countries.indexOf(getCountry(card)) === -1) show = false;

        /* Age statement */
        if (show && state.ages.length && state.ages.indexOf(getAge(card)) === -1) show = false;

        /* Rating tier — card matches if its tier >= any selected tier */
        if (show && state.ratings.length) {
          var tier = getRatingTier(card);
          if (state.ratings.indexOf(tier) === -1) show = false;
        }

        card.setAttribute('data-hidden', show ? 'false' : 'true');
        if (show) visibleCount++;
      });

      if (countEl) countEl.textContent = visibleCount + (visibleCount === 1 ? ' product' : ' products');

      var noResults = document.getElementById('shop-no-results') ||
                      document.querySelector('.shop-no-results');
      if (noResults) noResults.classList.toggle('visible', visibleCount === 0);

      updateStatusPill(visibleCount);
      applySort();
    }

    /* ── Sort ── */
    function applySort() {
      var grids = document.querySelectorAll('.shop-content .product-grid, #shop-product-grid');
      var seen  = [];
      grids.forEach(function (grid) {
        if (seen.indexOf(grid) !== -1) return;
        seen.push(grid);
        var cards = Array.prototype.slice.call(grid.querySelectorAll('.p-card[data-category]'));
        if (cards.length < 2) return;
        cards.sort(function (a, b) {
          switch (state.sort) {
            case 'price-asc':  return getPrice(a) - getPrice(b);
            case 'price-desc': return getPrice(b) - getPrice(a);
            case 'name-asc':   return getName(a).localeCompare(getName(b));
            case 'name-desc':  return getName(b).localeCompare(getName(a));
            case 'newest':     return getNewest(b) - getNewest(a);
            default:           return getRating(b) - getRating(a);
          }
        });
        cards.forEach(function (card) { grid.appendChild(card); });
      });
    }

    /* ── Checkbox group binding ── */
    function bindCheckboxGroup(checks, stateKey) {
      checks.forEach(function (cb) {
        cb.addEventListener('change', function () {
          state[stateKey] = [];
          checks.forEach(function (c) { if (c.checked) state[stateKey].push(c.value); });
          applyFilters();
        });
      });
    }

    /* Bind all groups */
    bindCheckboxGroup(catChecks,        'categories');
    bindCheckboxGroup(availChecks,      'availability');
    bindCheckboxGroup(brandChecks,      'brands');
    bindCheckboxGroup(sizeChecks,       'sizes');
    bindCheckboxGroup(collectionChecks, 'collections');
    bindCheckboxGroup(typeChecks,       'types');
    bindCheckboxGroup(styleChecks,      'styles');
    bindCheckboxGroup(countryChecks,    'countries');
    bindCheckboxGroup(ageChecks,        'ages');
    bindCheckboxGroup(ratingChecks,     'ratings');

    /* ── Price slider (live) ── */
    if (priceSlider) {
      priceSlider.addEventListener('input', function () {
        state.priceMax = parseInt(priceSlider.value, 10);
        if (priceMaxEl) priceMaxEl.value = state.priceMax;
        applyFilters();
      });
    }

    /* ── Price inputs ── */
    if (priceMinEl) {
      priceMinEl.addEventListener('change', function () {
        state.priceMin = Math.max(0, parseInt(priceMinEl.value, 10) || 0);
      });
    }
    if (priceMaxEl) {
      priceMaxEl.addEventListener('change', function () {
        state.priceMax = parseInt(priceMaxEl.value, 10) || maxPriceInData;
        if (priceSlider) priceSlider.value = state.priceMax;
      });
    }
    if (priceApply) {
      priceApply.addEventListener('click', function () {
        state.priceMin = Math.max(0, parseInt(priceMinEl ? priceMinEl.value : 0, 10) || 0);
        state.priceMax = parseInt(priceMaxEl ? priceMaxEl.value : maxPriceInData, 10) || maxPriceInData;
        if (priceSlider) priceSlider.value = state.priceMax;
        applyFilters();
      });
    }

    /* ── Sort dropdown ── */
    if (sortEl) {
      sortEl.addEventListener('change', function () {
        state.sort = sortEl.value;
        applyFilters();
      });
    }

    /* ── Reset all ── */
    function resetAll() {
      state.categories   = [];
      state.availability = [];
      state.brands       = [];
      state.sizes        = [];
      state.collections  = [];
      state.types        = [];
      state.styles       = [];
      state.countries    = [];
      state.ages         = [];
      state.ratings      = [];
      state.priceMin     = 0;
      state.priceMax     = maxPriceInData;
      state.sort         = 'best-selling';

      [catChecks, availChecks, brandChecks, sizeChecks, collectionChecks,
       typeChecks, styleChecks, countryChecks, ageChecks, ratingChecks]
        .forEach(function (group) {
          group.forEach(function (c) { c.checked = false; });
        });

      if (priceSlider) priceSlider.value = maxPriceInData;
      if (priceMinEl)  priceMinEl.value  = 0;
      if (priceMaxEl)  priceMaxEl.value  = maxPriceInData;
      if (sortEl)      sortEl.value      = 'best-selling';

      applyFilters();
      if (window._l46 && window._l46.toast) window._l46.toast('Filters cleared.');
    }

    if (resetBtn)    resetBtn.addEventListener('click',    resetAll);
    if (resetInline) resetInline.addEventListener('click', resetAll);

    /* Wire any extra .fs-reset-all buttons on the page */
    document.querySelectorAll('.fs-reset-all').forEach(function (btn) {
      if (btn !== resetBtn) btn.addEventListener('click', resetAll);
    });

    /* Show initial count */
    updateStatusPill(totalCount);
  }

  /* ========================================================
     SECTION 2: PRODUCT SLIDER (home page)
     ======================================================== */

  function initSliders() {
    document.querySelectorAll('.product-slider').forEach(function (slider) {
      var track         = slider.querySelector('.product-slider-track');
      var wrap          = slider.parentElement;
      var prevBtn       = wrap ? wrap.querySelector('.slider-arrow-prev')  : null;
      var nextBtn       = wrap ? wrap.querySelector('.slider-arrow-next')  : null;
      var dotsContainer = wrap ? wrap.querySelector('.slider-dots')        : null;
      if (!track) return;

      var currentIndex     = 0;
      var isDragging       = false;
      var startX           = 0;
      var currentTranslate = 0;
      var prevTranslate    = 0;

      function getSlidesPerView() {
        var w = window.innerWidth;
        if (w <= 480)  return 1;
        if (w <= 640)  return 2;
        if (w <= 900)  return 2;
        if (w <= 1080) return 3;
        return 4;
      }
      function getCards()      { return track.querySelectorAll('.p-card'); }
      function getMaxIndex()   { return Math.max(0, getCards().length - getSlidesPerView()); }
      function getSlideWidth() {
        var cards = getCards();
        if (!cards.length) return 0;
        return cards[0].offsetWidth + (parseInt(getComputedStyle(track).gap) || 20);
      }

      function updatePosition(animate) {
        track.style.transition = animate === false ? 'none' : 'transform .35s cubic-bezier(.4,0,.2,1)';
        currentTranslate = -(currentIndex * getSlideWidth());
        track.style.transform = 'translateX(' + currentTranslate + 'px)';
        prevTranslate = currentTranslate;
        if (prevBtn) prevBtn.disabled = currentIndex === 0;
        if (nextBtn) nextBtn.disabled = currentIndex >= getMaxIndex();
        if (dotsContainer) {
          var dots = Math.max(1, getCards().length - getSlidesPerView() + 1);
          dotsContainer.innerHTML = '';
          for (var d = 0; d < dots; d++) {
            var dot = document.createElement('button');
            dot.className = 'slider-dot' + (d === currentIndex ? ' active' : '');
            dot.setAttribute('aria-label', 'Go to slide ' + (d + 1));
            dot.setAttribute('data-index', String(d));
            dot.addEventListener('click', function () {
              currentIndex = parseInt(this.getAttribute('data-index'), 10);
              updatePosition();
            });
            dotsContainer.appendChild(dot);
          }
        }
      }

      if (prevBtn) prevBtn.addEventListener('click', function () { if (currentIndex > 0)             { currentIndex--; updatePosition(); } });
      if (nextBtn) nextBtn.addEventListener('click', function () { if (currentIndex < getMaxIndex()) { currentIndex++; updatePosition(); } });

      function posX(e) { return e.type.indexOf('touch') !== -1 ? e.touches[0].clientX : e.clientX; }

      track.addEventListener('mousedown',  function (e) { isDragging = true; startX = posX(e); track.classList.add('dragging'); });
      track.addEventListener('touchstart', function (e) { isDragging = true; startX = posX(e); track.classList.add('dragging'); }, { passive: true });

      function onMove(e) {
        if (!isDragging) return;
        track.style.transform = 'translateX(' + (prevTranslate + posX(e) - startX) + 'px)';
      }
      track.addEventListener('mousemove', onMove);
      track.addEventListener('touchmove', onMove, { passive: true });

      function onEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('dragging');
        var diff = (e.type.indexOf('touch') !== -1 ? e.changedTouches[0].clientX : e.clientX) - startX;
        if      (diff < -50 && currentIndex < getMaxIndex()) currentIndex++;
        else if (diff >  50 && currentIndex > 0)             currentIndex--;
        updatePosition();
      }
      track.addEventListener('mouseup',    onEnd);
      track.addEventListener('mouseleave', onEnd);
      track.addEventListener('touchend',   onEnd);

      var resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          if (currentIndex > getMaxIndex()) currentIndex = getMaxIndex();
          updatePosition(false);
        }, 150);
      });

      updatePosition(false);
    });
  }

  /* ========================================================
     INIT
     ======================================================== */
  function init() {
    initFilterAccordions();
    initFilterDrawer();
    initFilterEngine();
    initSliders();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
