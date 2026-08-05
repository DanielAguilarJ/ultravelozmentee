'use strict';
/* ═══════════════════════════════════════════════════════════════════
   Blog Article JS — WorldBrain
   Bookmark, share, and scroll progress tracking
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  var SAVED_KEY = 'worldbrain.blog.saved.v1';
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

  function getSlug() {
    var path = window.location.pathname || '';
    var parts = path.split('/').filter(Boolean);
    var slug = parts[parts.length - 1] || '';
    return /^blog-[a-z0-9-]+$/.test(slug) ? slug : '';
  }

  // Throttle scroll updates: requestAnimationFrame with setTimeout(0) fallback
  var rAF = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : function (cb) { setTimeout(cb, 0); };

  function init() {
    if (_initialized) return;
    _initialized = true;
    var slug = getSlug();
    var progressBar = document.querySelector('[role="progressbar"]');
    var bookmarkBtn = document.querySelector('[data-bookmark]');
    var shareBtn = document.querySelector('.ed-share-btn');

    // Restore bookmark state
    if (bookmarkBtn && slug) {
      var savedSlugs = getSavedSlugs();
      if (savedSlugs.indexOf(slug) !== -1) {
        bookmarkBtn.setAttribute('aria-pressed', 'true');
      }
      bookmarkBtn.addEventListener('click', function () {
        var pressed = bookmarkBtn.getAttribute('aria-pressed') === 'true';
        bookmarkBtn.setAttribute('aria-pressed', pressed ? 'false' : 'true');
        var slugs = getSavedSlugs();
        if (pressed) {
          slugs = slugs.filter(function (s) { return s !== slug; });
        } else {
          if (slugs.indexOf(slug) === -1) slugs.push(slug);
        }
        saveSlugs(slugs);
      });
    }

    // Share button
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        var url = window.location.href;
        var title = document.title || '';
        if (navigator.share) {
          navigator.share({ title: title, url: url }).catch(function () {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            shareBtn.textContent = '¡Copiado!';
            setTimeout(function () { shareBtn.textContent = 'Compartir'; }, 2000);
          }).catch(function () {});
        }
      });
    }

    // Scroll progress with rAF throttling
    var ticking = false;

    function updateProgress() {
      if (!progressBar) return;
      var scrollHeight = document.documentElement.scrollHeight;
      var innerHeight = window.innerHeight;
      var scrollY = window.scrollY || window.pageYOffset || 0;
      var total = scrollHeight - innerHeight;
      var progress = total > 0 ? Math.round((scrollY / total) * 100) : 0;
      if (progress < 0) progress = 0;
      if (progress > 100) progress = 100;
      progressBar.setAttribute('aria-valuenow', String(progress));
      var bar = progressBar.querySelector('.ed-progress-bar');
      if (bar) {
        bar.style.width = progress + '%';
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      rAF(function () {
        updateProgress();
        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    updateProgress();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
