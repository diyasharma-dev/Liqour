/* ========================================================
   Liquor 46 — Filter Sidebar & Product Slider (additive JS)
   Loaded after app.js. Does not modify existing JS.
   ======================================================== */
(function () {
  'use strict';

  /* ========================================================
     SECTION 1: FILTER SIDEBAR
     ======================================================== */

  /* --- Accordion toggle for filter cards --- */
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
    var sidebar = document.getElementById('filter-sidebar');
    var toggleBtn = document.getElementById('filter-toggle-btn');
    var overlay = document.getElementById('filter-drawer-overlay');
    if (!sidebar || !toggleBtn || !overlay) return;

    function openDrawer() {
      sidebar.classList.add('open');
      overlay.classList.add('active');
      overlay.classList.remove('closing');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      sidebar.classList.remove('open');
      overlay.classList.add('closing');
      document.body.style.overflow = '';
      setTimeout(function () {
        overlay.classList.remove('active', 'closing');
      }, 300);
    }

    toggleBtn.addEventListener('click', function () {
      if (sidebar.classList.contains('open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    overlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        closeDrawer();
      }
    });
  }

  /* --- Filter & Sort engine --- */
  function initFilterEngine() {
    var sidebar = document.getElementById('filter-sidebar');
    if (!sidebar) return;

    var countEl = document.getElementById('shop-product-count');
    var sortEl = document.getElementById('shop-sort-select');
    var resetBtn = document.getElementById('fs-reset');
    var resetInline = document.getElementById('fs-reset-inline');
    var priceSlider = document.getElementById('fs-price-slider');
    var priceMin = document.getElementById('fs-price-min');
    var priceMax = document.getElementById('fs-price-max');
    var priceApply = document.getElementById('fs-price-apply');
    var statusEl = document.getElementById('filter-status');

    /* Gather ALL p-cards on the page */
    var allCards = Array.prototype.slice.call(document.querySelectorAll('.p-card[data-category]'));

    /* Checkbox groups */
    var catChecks = sidebar.querySelectorAll('[data-filter-group="category"] .fs-option input');
    var availChecks = sidebar.querySelectorAll('[data-filter-group="availability"] .fs-option input');
    var brandChecks = sidebar.querySelectorAll('[data-filter-group="brand"] .fs-option input');
    var sizeChecks = sidebar.querySelectorAll('[data-filter-group="size"] .fs-option input');
    var collectionChecks = sidebar.querySelectorAll('[data-filter-group="collections"] .fs-option input');

    /* Current filter state */
    var state = {
      categories: [],
      availability: [],
      brands: [],
      sizes: [],
      collections: [],
      priceMax: 200,
      priceMin: 0,
      sort: 'best-selling'
    };

    function getCat(card) {
      return (card.getAttribute('data-category') || '').toLowerCase();
    }

    function getPrice(card) {
      return parseFloat(card.getAttribute('data-price')) || 0;
    }

    function getStock(card) {
      return (card.getAttribute('data-stock') || '').toLowerCase();
    }

    function getName(card) {
      return (card.getAttribute('data-name') || card.querySelector('.p-name')).textContent.trim().toLowerCase();
    }

    function getRating(card) {
      return parseFloat(card.getAttribute('data-rating')) || 0;
    }

    function getBrand(card) {
      return (card.getAttribute('data-brand') || '').toLowerCase();
    }

    function getSize(card) {
      return (card.getAttribute('data-size') || '').toLowerCase();
    }

    function getCollections(card) {
      return (card.getAttribute('data-collection') || '').toLowerCase();
    }

    function getNewest(card) {
      return parseInt(card.getAttribute('data-newest') || '0', 10) || 0;
    }

    function countActiveFilters() {
      var n = 0;
      if (state.categories.length) n++;
      if (state.availability.length) n++;
      if (state.brands.length) n++;
      if (state.sizes.length) n++;
      if (state.collections.length) n++;
      if (state.priceMin > 0 || state.priceMax < 200) n++;
      return n;
    }

    function updateStatusPill() {
      if (!statusEl) return;
      var n = countActiveFilters();
      if (n === 0) {
        statusEl.textContent = 'No filters applied';
        statusEl.classList.remove('has-filters');
      } else {
        statusEl.textContent = n + (n === 1 ? ' filter applied' : ' filters applied');
        statusEl.classList.add('has-filters');
      }
    }

    function applyFilters() {
      var visibleCount = 0;

      allCards.forEach(function (card) {
        var cat = getCat(card);
        var price = getPrice(card);
        var stock = getStock(card);
        var brand = getBrand(card);
        var size = getSize(card);
        var collections = getCollections(card);
        var show = true;

        /* Category filter */
        if (state.categories.length > 0 && state.categories.indexOf(cat) === -1) {
          show = false;
        }

        /* Price filter */
        if (price < state.priceMin || price > state.priceMax) {
          show = false;
        }

        /* Availability filter */
        if (state.availability.length > 0 && state.availability.indexOf(stock) === -1) {
          show = false;
        }

        /* Brand filter */
        if (state.brands.length > 0 && state.brands.indexOf(brand) === -1) {
          show = false;
        }

        /* Size filter */
        if (state.sizes.length > 0 && state.sizes.indexOf(size) === -1) {
          show = false;
        }

        /* Collection filter (space-separated list) */
        if (state.collections.length > 0) {
          var cardCollections = collections.split(/\s+/);
          var hasMatch = false;
          for (var i = 0; i < state.collections.length; i++) {
            if (cardCollections.indexOf(state.collections[i]) !== -1) {
              hasMatch = true;
              break;
            }
          }
          if (!hasMatch) show = false;
        }

        card.setAttribute('data-hidden', show ? 'false' : 'true');
        if (show) visibleCount++;
      });

      /* Update count */
      if (countEl) {
        countEl.textContent = visibleCount + (visibleCount === 1 ? ' product' : ' products');
      }

      /* Show/hide no-results message */
      var noResults = document.querySelector('.shop-no-results');
      if (noResults) {
        noResults.classList.toggle('visible', visibleCount === 0);
      }

      /* Update filter status pill */
      updateStatusPill();

      /* Apply sorting */
      applySort();
    }

    function applySort() {
      var grids = document.querySelectorAll('.shop-content .product-grid');
      grids.forEach(function (grid) {
        var cards = Array.prototype.slice.call(grid.querySelectorAll('.p-card[data-category]'));
        if (cards.length < 2) return;

        cards.sort(function (a, b) {
          switch (state.sort) {
            case 'price-asc':
              return getPrice(a) - getPrice(b);
            case 'price-desc':
              return getPrice(b) - getPrice(a);
            case 'name-asc':
              return getName(a).localeCompare(getName(b));
            case 'name-desc':
              return getName(b).localeCompare(getName(a));
            case 'best-selling':
              return getRating(b) - getRating(a);
            case 'newest':
              return getNewest(b) - getNewest(a);
            default:
              return 0;
          }
        });

        cards.forEach(function (card) {
          grid.appendChild(card);
        });
      });
    }

    /* --- Event listeners --- */

    function bindCheckboxGroup(checks, stateKey) {
      checks.forEach(function (cb) {
        cb.addEventListener('change', function () {
          state[stateKey] = [];
          checks.forEach(function (c) {
            if (c.checked) state[stateKey].push(c.value);
          });
          applyFilters();
        });
      });
    }

    bindCheckboxGroup(catChecks, 'categories');
    bindCheckboxGroup(availChecks, 'availability');
    bindCheckboxGroup(brandChecks, 'brands');
    bindCheckboxGroup(sizeChecks, 'sizes');
    bindCheckboxGroup(collectionChecks, 'collections');

    /* Price slider */
    if (priceSlider) {
      priceSlider.addEventListener('input', function () {
        state.priceMax = parseInt(priceSlider.value, 10);
        if (priceMax) priceMax.value = state.priceMax;
      });
    }

    /* Price inputs */
    if (priceMin) {
      priceMin.addEventListener('change', function () {
        state.priceMin = parseInt(priceMin.value, 10) || 0;
      });
    }
    if (priceMax) {
      priceMax.addEventListener('change', function () {
        state.priceMax = parseInt(priceMax.value, 10) || 200;
        if (priceSlider) priceSlider.value = state.priceMax;
      });
    }

    /* Price apply */
    if (priceApply) {
      priceApply.addEventListener('click', function () {
        state.priceMin = parseInt(priceMin.value, 10) || 0;
        state.priceMax = parseInt(priceMax.value, 10) || 200;
        if (priceSlider) priceSlider.value = state.priceMax;
        applyFilters();
      });
    }

    /* Sort dropdown */
    if (sortEl) {
      sortEl.addEventListener('change', function () {
        state.sort = sortEl.value;
        applyFilters();
      });
    }

    /* Reset */
    function resetAll() {
      state.categories = [];
      state.availability = [];
      state.brands = [];
      state.sizes = [];
      state.collections = [];
      state.priceMin = 0;
      state.priceMax = 200;
      state.sort = 'best-selling';

      catChecks.forEach(function (c) { c.checked = false; });
      availChecks.forEach(function (c) { c.checked = false; });
      brandChecks.forEach(function (c) { c.checked = false; });
      sizeChecks.forEach(function (c) { c.checked = false; });
      collectionChecks.forEach(function (c) { c.checked = false; });
      if (priceSlider) priceSlider.value = 200;
      if (priceMin) priceMin.value = 0;
      if (priceMax) priceMax.value = 200;
      if (sortEl) sortEl.value = 'best-selling';

      applyFilters();
      if (window._l46 && window._l46.toast) window._l46.toast('Filters cleared.');
    }

    if (resetBtn) resetBtn.addEventListener('click', resetAll);
    if (resetInline) resetInline.addEventListener('click', resetAll);
  }

  /* ========================================================
     SECTION 2: PRODUCT SLIDER
     ======================================================== */

  function initSliders() {
    document.querySelectorAll('.product-slider').forEach(function (slider) {
      var track = slider.querySelector('.product-slider-track');
      var prevBtn = slider.parentElement.querySelector('.slider-arrow-prev');
      var nextBtn = slider.parentElement.querySelector('.slider-arrow-next');
      var dotsContainer = slider.parentElement.querySelector('.slider-dots');
      if (!track) return;

      var currentIndex = 0;
      var isDragging = false;
      var startX = 0;
      var currentTranslate = 0;
      var prevTranslate = 0;

      function getSlidesPerView() {
        var w = window.innerWidth;
        if (w <= 480) return 1;
        if (w <= 640) return 2;
        if (w <= 900) return 2;
        if (w <= 1080) return 3;
        return 4;
      }

      function getTotalSlides() {
        return track.querySelectorAll('.p-card').length;
      }

      function getMaxIndex() {
        return Math.max(0, getTotalSlides() - getSlidesPerView());
      }

      function getSlideWidth() {
        var cards = track.querySelectorAll('.p-card');
        if (cards.length === 0) return 0;
        var cardWidth = cards[0].offsetWidth;
        var gap = parseInt(getComputedStyle(track).gap) || 22;
        return cardWidth + gap;
      }

      function updatePosition(animate) {
        if (animate === false) {
          track.style.transition = 'none';
        } else {
          track.style.transition = 'transform .35s cubic-bezier(.4, 0, .2, 1)';
        }

        var slideWidth = getSlideWidth();
        currentTranslate = -(currentIndex * slideWidth);
        track.style.transform = 'translateX(' + currentTranslate + 'px)';
        prevTranslate = currentTranslate;

        /* Update arrows */
        if (prevBtn) prevBtn.disabled = currentIndex === 0;
        if (nextBtn) nextBtn.disabled = currentIndex >= getMaxIndex();

        /* Update dots */
        if (dotsContainer) {
          var totalSlides = getTotalSlides();
          var perView = getSlidesPerView();
          var totalDots = Math.max(1, totalSlides - perView + 1);
          dotsContainer.innerHTML = '';
          for (var d = 0; d < totalDots; d++) {
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

      /* Arrow navigation */
      if (prevBtn) {
        prevBtn.addEventListener('click', function () {
          if (currentIndex > 0) {
            currentIndex--;
            updatePosition();
          }
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          if (currentIndex < getMaxIndex()) {
            currentIndex++;
            updatePosition();
          }
        });
      }

      /* Touch / mouse drag */
      function getPositionX(e) {
        return e.type.indexOf('touch') !== -1 ? e.touches[0].clientX : e.clientX;
      }

      track.addEventListener('mousedown', function (e) {
        isDragging = true;
        startX = getPositionX(e);
        track.classList.add('dragging');
      });

      track.addEventListener('touchstart', function (e) {
        isDragging = true;
        startX = getPositionX(e);
        track.classList.add('dragging');
      }, { passive: true });

      function onMove(e) {
        if (!isDragging) return;
        var x = getPositionX(e);
        var diff = x - startX;
        track.style.transform = 'translateX(' + (prevTranslate + diff) + 'px)';
      }

      track.addEventListener('mousemove', onMove);
      track.addEventListener('touchmove', onMove, { passive: true });

      function onEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('dragging');

        var endX = e.type.indexOf('touch') !== -1 ? e.changedTouches[0].clientX : e.clientX;
        var diff = endX - startX;
        var threshold = 50;

        if (diff < -threshold && currentIndex < getMaxIndex()) {
          currentIndex++;
        } else if (diff > threshold && currentIndex > 0) {
          currentIndex--;
        }
        updatePosition();
      }

      track.addEventListener('mouseup', onEnd);
      track.addEventListener('mouseleave', onEnd);
      track.addEventListener('touchend', onEnd);

      /* Responsive recalculation */
      var resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          if (currentIndex > getMaxIndex()) {
            currentIndex = getMaxIndex();
          }
          updatePosition(false);
        }, 150);
      });

      /* Initial render */
      updatePosition(false);
    });
  }

  /* ========================================================
     INIT — runs after DOM ready
     ======================================================== */
  function initFiltersAndSliders() {
    initFilterAccordions();
    initFilterDrawer();
    initFilterEngine();
    initSliders();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFiltersAndSliders);
  } else {
    initFiltersAndSliders();
  }
})();
