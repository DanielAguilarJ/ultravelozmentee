'use strict';
/* ═══════════════════════════════════════════════════════════════════
   Blog Article JS — WorldBrain
   Progreso, orientación por sección, guardado y compartir accesible.
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
      /* El artículo sigue funcionando sin almacenamiento. */
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

  function setBookmarkState(button, saved) {
    button.setAttribute('aria-pressed', saved ? 'true' : 'false');
    button.setAttribute('aria-label', saved ? 'Quitar artículo de guardados' : 'Guardar artículo');
    var label = button.querySelector('[data-bookmark-label]');
    if (label) label.textContent = saved ? 'Guardado' : 'Guardar';
    var icon = button.querySelector('i');
    if (icon) icon.className = saved ? 'fas fa-bookmark' : 'far fa-bookmark';
  }

  function announce(status, message) {
    if (!status) return;
    status.textContent = '';
    window.setTimeout(function () {
      status.textContent = message;
    }, 20);
  }

  function setCurrentSection(links, targetId) {
    links.forEach(function (link) {
      if (link.getAttribute('href') === '#' + targetId) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function initSectionNavigation() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.ed-toc-link'));
    if (!links.length) return;

    var seen = Object.create(null);
    var sections = links.map(function (link) {
      var targetId = (link.getAttribute('href') || '').replace(/^#/, '');
      if (!targetId || seen[targetId]) return null;
      seen[targetId] = true;
      return document.getElementById(targetId);
    }).filter(Boolean);

    if (sections.length) setCurrentSection(links, sections[0].id);

    links.forEach(function (link) {
      link.addEventListener('click', function () {
        var details = link.closest('.ed-mobile-toc');
        if (details) details.open = false;
      });
    });

    if (!('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      var visible = entries.filter(function (entry) {
        return entry.isIntersecting;
      }).sort(function (first, second) {
        return first.boundingClientRect.top - second.boundingClientRect.top;
      });
      if (visible.length) setCurrentSection(links, visible[0].target.id);
    }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, 1] });
    sections.forEach(function (section) { observer.observe(section); });
  }

  var rAF = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : function (callback) { setTimeout(callback, 0); };

  function init() {
    if (_initialized) return;
    _initialized = true;

    var slug = getSlug();
    var main = document.querySelector('.ed-blog-main');
    var progressBar = document.querySelector('[role="progressbar"]');
    var bookmarkBtn = document.querySelector('[data-bookmark]');
    var shareBtn = document.querySelector('.ed-share-btn');
    var shareStatus = document.querySelector('.ed-share-status');
    var remaining = document.querySelector('[data-reading-remaining]');
    var readingMinutes = main ? Number(main.getAttribute('data-reading-minutes')) || 0 : 0;

    if (bookmarkBtn && slug) {
      var initiallySaved = getSavedSlugs().indexOf(slug) !== -1;
      setBookmarkState(bookmarkBtn, initiallySaved);
      bookmarkBtn.addEventListener('click', function () {
        var saved = bookmarkBtn.getAttribute('aria-pressed') === 'true';
        var slugs = getSavedSlugs();
        if (saved) {
          slugs = slugs.filter(function (item) { return item !== slug; });
        } else if (slugs.indexOf(slug) === -1) {
          slugs = slugs.concat(slug);
        }
        saveSlugs(slugs);
        setBookmarkState(bookmarkBtn, !saved);
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        var url = window.location.href;
        var title = document.title || '';
        if (navigator.share) {
          navigator.share({ title: title, url: url }).then(function () {
            announce(shareStatus, 'Artículo compartido.');
          }).catch(function (error) {
            if (!error || error.name !== 'AbortError') {
              announce(shareStatus, 'No se pudo compartir. Copia la dirección desde el navegador.');
            }
          });
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            announce(shareStatus, 'Enlace copiado al portapapeles.');
          }).catch(function () {
            announce(shareStatus, 'No se pudo copiar. Copia la dirección desde el navegador.');
          });
        } else {
          announce(shareStatus, 'Copia la dirección desde la barra del navegador.');
        }
      });
    }

    var ticking = false;

    function updateProgress() {
      if (!progressBar) return;
      var scrollHeight = document.documentElement.scrollHeight;
      var innerHeight = window.innerHeight;
      var scrollY = window.scrollY || window.pageYOffset || 0;
      var total = scrollHeight - innerHeight;
      var progress = total > 0 ? Math.round((scrollY / total) * 100) : 0;
      progress = Math.max(0, Math.min(100, progress));
      progressBar.setAttribute('aria-valuenow', String(progress));
      var bar = progressBar.querySelector('.ed-progress-bar');
      if (bar) bar.style.width = progress + '%';
      if (remaining && readingMinutes) {
        var minutesLeft = Math.max(1, Math.ceil(readingMinutes * (1 - progress / 100)));
        remaining.textContent = progress >= 98 ? 'Lectura completada' : minutesLeft + ' min restantes';
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
    initSectionNavigation();
    updateProgress();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
