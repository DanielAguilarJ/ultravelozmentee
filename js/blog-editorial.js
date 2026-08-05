'use strict';
/* ═══════════════════════════════════════════════════════════════════
   Blog Editorial JS — WorldBrain
   Filters, bookmarks, view toggle, safe /api/posts loader
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  var SAVED_KEY = 'worldbrain.blog.saved.v1';
  var VIEW_KEY = 'worldbrain.blog.view.v1';
  var MAX_TEXT_LEN = 300;
  var _initialized = false;

  function getStorageItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function setStorageItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      /* storage unavailable */
    }
  }

  function getSavedSlugs() {
    var raw = getStorageItem(SAVED_KEY);
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (slug) {
        return typeof slug === 'string' && /^blog-[a-z0-9-]+$/.test(slug);
      }).slice(0, 500);
    } catch (e) {
      return [];
    }
  }

  function saveSlugs(arr) {
    setStorageItem(SAVED_KEY, JSON.stringify(arr));
  }

  function limitText(str, max) {
    var s = String(str || '');
    return s.length > max ? s.slice(0, max) : s;
  }

  function normalizeSearch(str) {
    return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function isValidDateParts(year, month, day) {
    var date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
  }

  function toIsoDate(value) {
    var raw = limitText(value || '', 50).trim();
    var isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (isoMatch) {
      var isoYear = parseInt(isoMatch[1], 10);
      var isoMonth = parseInt(isoMatch[2], 10);
      var isoDay = parseInt(isoMatch[3], 10);
      return isValidDateParts(isoYear, isoMonth, isoDay)
        ? isoMatch[1] + '-' + isoMatch[2] + '-' + isoMatch[3]
        : '';
    }

    var months = {
      enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
      julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
    };
    var normalized = normalizeSearch(raw);
    var localMatch = /^(\d{1,2})\s+([a-z]+)(?:,)?\s+(\d{4})$/.exec(normalized);
    if (!localMatch || !months[localMatch[2]]) return '';
    var day = parseInt(localMatch[1], 10);
    var month = months[localMatch[2]];
    var year = parseInt(localMatch[3], 10);
    if (!isValidDateParts(year, month, day)) return '';
    return String(year) + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }

  function init() {
    if (_initialized) return;
    _initialized = true;
    var feed = document.querySelector('[data-editorial-feed]');
    var searchInput = document.querySelector('input[type="search"]');
    var topicChips = document.querySelectorAll('button[data-topic]');
    var savedFilter = document.querySelector('[data-saved-filter]');
    var viewToggle = document.querySelector('.ed-view-toggle');
    var liveRegion = document.querySelector('[aria-live="polite"]');
    var emptyState = document.querySelector('[data-empty-state]');
    var savedCountEl = document.querySelector('[data-saved-count]');
    var allCards = [];

    function getStaticCards() {
      return [].slice.call(document.querySelectorAll('article.ed-card'));
    }
    allCards = getStaticCards();

    var currentTopic = 'all';
    var currentSearch = '';
    var showSavedOnly = false;

    // Restore view preference
    var savedView = getStorageItem(VIEW_KEY);
    if ((savedView === 'grid' || savedView === 'compact') && feed) {
      feed.dataset.view = savedView;
    }

    // Restore bookmark states
    var savedSlugs = getSavedSlugs();
    allCards.forEach(function (card) {
      var slug = card.dataset.slug;
      var btn = card.querySelector('[data-bookmark]');
      if (btn && savedSlugs.indexOf(slug) !== -1) {
        btn.setAttribute('aria-pressed', 'true');
      }
    });

    function updateSavedCount() {
      if (savedCountEl) {
        var count = getSavedSlugs().length;
        savedCountEl.textContent = count + ' guardado' + (count !== 1 ? 's' : '');
      }
    }
    updateSavedCount();

    function applyFilters() {
      var visibleCount = 0;
      var savedNow = getSavedSlugs();
      allCards.forEach(function (card) {
        var slug = card.dataset.slug || '';
        var topics = (card.dataset.topic || '').split(/\s+/);
        var text = normalizeSearch(card.textContent || '');
        var searchTerm = normalizeSearch(currentSearch);

        var matchTopic = currentTopic === 'all' || topics.indexOf(currentTopic) !== -1;
        var matchSearch = !searchTerm || text.indexOf(searchTerm) !== -1;
        var matchSaved = !showSavedOnly || savedNow.indexOf(slug) !== -1;

        var visible = matchTopic && matchSearch && matchSaved;
        card.hidden = !visible;
        if (visible) visibleCount++;
      });
      if (liveRegion) {
        liveRegion.textContent = visibleCount + ' artículo' + (visibleCount !== 1 ? 's' : '') + ' encontrado' + (visibleCount !== 1 ? 's' : '');
      }
      if (emptyState) {
        emptyState.hidden = visibleCount > 0;
      }
    }

    // Search
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        currentSearch = searchInput.value;
        showSavedOnly = false;
        if (savedFilter) savedFilter.setAttribute('aria-pressed', 'false');
        applyFilters();
      });
    }

    // Topic chips
    topicChips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        currentTopic = chip.dataset.topic;
        showSavedOnly = false;
        if (savedFilter) savedFilter.setAttribute('aria-pressed', 'false');
        topicChips.forEach(function (c) {
          c.setAttribute('aria-pressed', c === chip ? 'true' : 'false');
        });
        applyFilters();
      });
    });

    // Saved filter
    if (savedFilter) {
      savedFilter.addEventListener('click', function () {
        showSavedOnly = !showSavedOnly;
        savedFilter.setAttribute('aria-pressed', showSavedOnly ? 'true' : 'false');
        currentTopic = 'all';
        currentSearch = '';
        if (searchInput) searchInput.value = '';
        topicChips.forEach(function (c) {
          c.setAttribute('aria-pressed', c.dataset.topic === 'all' ? 'true' : 'false');
        });
        applyFilters();
      });
    }

    // View toggle
    if (viewToggle && feed) {
      viewToggle.addEventListener('click', function () {
        var current = feed.dataset.view || 'grid';
        var next = current === 'grid' ? 'compact' : 'grid';
        feed.dataset.view = next;
        setStorageItem(VIEW_KEY, next);
      });
    }

    // Bookmark handler for any card
    function attachBookmark(card) {
      var btn = card.querySelector('[data-bookmark]');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var slug = card.dataset.slug;
        var pressed = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', pressed ? 'false' : 'true');
        var slugs = getSavedSlugs();
        if (pressed) {
          slugs = slugs.filter(function (s) { return s !== slug; });
        } else {
          if (slugs.indexOf(slug) === -1) slugs.push(slug);
        }
        saveSlugs(slugs);
        updateSavedCount();
        if (showSavedOnly) applyFilters();
      });
    }

    allCards.forEach(attachBookmark);
    applyFilters();

    // Load /api/posts with safe DOM APIs
    if (typeof fetch === 'function') {
      fetch('/api/posts').then(function (res) {
        if (!res.ok) return;
        return res.json();
      }).then(function (posts) {
        if (!Array.isArray(posts) || !posts.length || !feed) return;
        var existingSlugs = allCards.map(function (c) { return c.dataset.slug; });
        var KNOWN_TOPICS = { infancia: 'infancia', liderazgo: 'liderazgo', seo: 'seo', cerebro: 'cerebro', educacion: 'educacion' };
        posts.forEach(function (post) {
          // Validate filename
          var filename = String(post.filename || '');
          if (!/^[a-z0-9\-]+\.html$/.test(filename)) return;
          var slug = filename.replace(/\.html$/, '');

          // Avoid duplicates
          if (existingSlugs.indexOf(slug) !== -1) return;
          existingSlugs.push(slug);

          var rawCat = limitText(post.category || '', 50);
          var normalized = rawCat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
          var topic = KNOWN_TOPICS[normalized] || 'educacion';

          var card = document.createElement('article');
          card.className = 'ed-card ed-card--dynamic';
          card.dataset.slug = slug;
          card.dataset.topic = topic;

          // Card copy section
          var copy = document.createElement('div');
          copy.className = 'ed-card-copy';

          var meta = document.createElement('div');
          meta.className = 'ed-card-meta';

          var category = document.createElement('span');
          category.className = 'ed-card-category';
          category.textContent = limitText(rawCat, 50);

          var time = document.createElement('time');
          var dateStr = limitText(post.date || '', 50);
          time.textContent = dateStr;
          time.setAttribute('datetime', toIsoDate(post.createdAt || dateStr));

          var readTime = document.createElement('span');
          readTime.className = 'ed-card-read-time';
          readTime.textContent = limitText(post.readTime || '', 50);

          meta.appendChild(category);
          meta.appendChild(time);
          meta.appendChild(readTime);
          copy.appendChild(meta);

          var title = document.createElement('h2');
          var titleLink = document.createElement('a');
          titleLink.href = '/' + slug;
          titleLink.textContent = limitText(post.title || '', MAX_TEXT_LEN);
          title.appendChild(titleLink);
          copy.appendChild(title);

          var excerpt = document.createElement('p');
          excerpt.textContent = limitText(post.excerpt || '', MAX_TEXT_LEN);
          copy.appendChild(excerpt);

          card.appendChild(copy);

          // Linked media
          var mediaLink = document.createElement('a');
          mediaLink.className = 'ed-card-media';
          mediaLink.href = '/' + slug;
          var img = document.createElement('img');
          img.src = 'images/' + slug + '_cover.webp';
          img.alt = limitText(post.title || slug, MAX_TEXT_LEN);
          img.loading = 'lazy';
          img.width = 190;
          img.height = 125;
          img.addEventListener('error', function () {
            img.src = 'images/fl-hero-brain.webp';
          }, { once: true });
          mediaLink.appendChild(img);
          card.appendChild(mediaLink);

          // Bookmark
          var bookmark = document.createElement('button');
          bookmark.setAttribute('data-bookmark', '');
          bookmark.setAttribute('aria-pressed', getSavedSlugs().indexOf(slug) !== -1 ? 'true' : 'false');
          bookmark.setAttribute('aria-label', 'Guardar artículo');
          bookmark.textContent = '\u2661';
          card.appendChild(bookmark);

          feed.appendChild(card);
          allCards.push(card);
          attachBookmark(card);
        });
        applyFilters();
        if (typeof AOS !== 'undefined' && AOS.refresh) {
          AOS.refresh();
        }
      }).catch(function (error) {
        if (window.console && typeof window.console.warn === 'function') {
          window.console.warn('No se pudieron cargar los artículos dinámicos.', error);
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
