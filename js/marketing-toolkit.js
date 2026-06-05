/**
 * WorldBrain México — Marketing & Conversion Toolkit
 * @description Self-contained marketing module with 7 features:
 *   1) Lightbox Popups  2) Floating Bars  3) Gamified Wheel
 *   4) Countdown Timers 5) Page Level Targeting 6) Exit Intent
 *   7) Geolocation Targeting
 *
 * @version 1.0.0
 * @architecture Single IIFE, WBMarketingToolkit namespace, localStorage frequency capping,
 *               dynamic DOM creation, integrates with window.trackMetaEvent()
 */
; (function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════
       CONFIGURATION
       ═══════════════════════════════════════════════════════ */

    var CONFIG = {
        // Lightbox
        lightboxScrollPercent: 0.40,
        lightboxDelayMs: 15000,
        lightboxCooldownDays: 3,

        // Floating Bar
        floatingBarDelayMs: 2000,
        floatingBarCooldownHours: 24,

        // Gamified Wheel
        wheelScrollPercent: 0.60,
        wheelCooldownDays: 7,

        // Countdown — end date (auto-rolls to next Sunday midnight)
        countdownEndDate: null, // auto-calculated

        // Exit Intent
        exitIntentSensitivity: 10, // px from top of viewport

        // Geolocation
        geoApiUrl: 'https://ipapi.co/json/',
        geoFallbackCity: 'Ciudad de México',

        // WhatsApp CTA
        whatsappNumber: '5215578107837',
        whatsappBaseUrl: 'https://wa.me/'
    };

    /* Auto-calculate next Sunday midnight for countdown */
    (function setCountdownEnd() {
        var now = new Date();
        var daysTillSunday = (7 - now.getDay()) % 7 || 7;
        var end = new Date(now);
        end.setDate(end.getDate() + daysTillSunday);
        end.setHours(23, 59, 59, 999);
        CONFIG.countdownEndDate = end;
    })();

    /* ═══════════════════════════════════════════════════════
       UTILITIES
       ═══════════════════════════════════════════════════════ */

    function $(sel, ctx) { return (ctx || document).querySelector(sel); }

    /** localStorage helpers with JSON + TTL */
    var Store = {
        set: function (key, val, ttlMs) {
            try {
                var data = { v: val, exp: ttlMs ? Date.now() + ttlMs : null };
                localStorage.setItem('wbm_' + key, JSON.stringify(data));
            } catch (e) { /* quota exceeded — silently ignore */ }
        },
        get: function (key) {
            try {
                var raw = localStorage.getItem('wbm_' + key);
                if (!raw) return null;
                var data = JSON.parse(raw);
                if (data.exp && Date.now() > data.exp) {
                    localStorage.removeItem('wbm_' + key);
                    return null;
                }
                return data.v;
            } catch (e) { return null; }
        },
        has: function (key) { return this.get(key) !== null; }
    };

    /** Track event via existing tracking system */
    function track(eventName, params) {
        if (typeof window.trackMetaEvent === 'function') {
            window.trackMetaEvent(eventName, params || {});
        }
    }

    /** Create element helper */
    function el(tag, attrs, children) {
        var node = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach(function (k) {
                if (k === 'className') node.className = attrs[k];
                else if (k === 'innerHTML') node.innerHTML = attrs[k];
                else if (k === 'textContent') node.textContent = attrs[k];
                else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
                else node.setAttribute(k, attrs[k]);
            });
        }
        if (children) {
            (Array.isArray(children) ? children : [children]).forEach(function (c) {
                if (typeof c === 'string') node.appendChild(document.createTextNode(c));
                else if (c) node.appendChild(c);
            });
        }
        return node;
    }

    /** Generate WhatsApp link with UTM message */
    function waLink(msg) {
        return CONFIG.whatsappBaseUrl + CONFIG.whatsappNumber +
            '?text=' + encodeURIComponent(msg);
    }

    /* ═══════════════════════════════════════════════════════
       PAGE LEVEL TARGETING
       ═══════════════════════════════════════════════════════ */

    var PageTargeting = {
        _type: 'general',
        _courseName: '',

        init: function () {
            var path = window.location.pathname.toLowerCase();

            var kidsPages = ['mathekids', 'fastkids', 'lectoescritura', 'juniormath', 'grandes-lideres', 'robotics'];
            var adultPages = ['fotolectura', 'memoria-prodigiosa', 'admision-universitaria', 'neurocomunicacion', 'universidad-dominical'];
            var proPages = ['alfa-cash', 'redaccion-ejecutiva'];

            var self = this;
            kidsPages.forEach(function (p) { if (path.indexOf(p) !== -1) { self._type = 'kids'; self._courseName = p; } });
            adultPages.forEach(function (p) { if (path.indexOf(p) !== -1) { self._type = 'adult'; self._courseName = p; } });
            proPages.forEach(function (p) { if (path.indexOf(p) !== -1) { self._type = 'pro'; self._courseName = p; } });
        },

        getContent: function () {
            var contents = {
                kids: {
                    icon: '🧒',
                    title: '¡Potencia el Genio de tu <span class="wbm-accent">Hijo!</span>',
                    body: 'Nuestros programas infantiles desarrollan habilidades cognitivas únicas. Más de 200,000 niños ya lo lograron.',
                    cta: '¡Agendar Clase GRATIS!',
                    waMsg: '¡Hola! Me interesa una clase de diagnóstico gratis para mi hijo(a) 🧒'
                },
                adult: {
                    icon: '🧠',
                    title: 'Desbloquea tu <span class="wbm-accent">Potencial Mental</span>',
                    body: 'Lectura ultra-rápida, memoria prodigiosa y técnicas de alto rendimiento. Tu ventaja competitiva empieza hoy.',
                    cta: '¡Quiero mi Clase Gratis!',
                    waMsg: '¡Hola! Me interesa una clase de diagnóstico gratis de aprendizaje acelerado 🧠'
                },
                pro: {
                    icon: '💼',
                    title: 'Lleva tu Carrera al <span class="wbm-accent">Siguiente Nivel</span>',
                    body: 'Habilidades ejecutivas que te diferencian. Finanzas, redacción y liderazgo de alto impacto.',
                    cta: '¡Agenda tu Sesión Ejecutiva!',
                    waMsg: '¡Hola! Me interesa información sobre el programa ejecutivo 💼'
                },
                general: {
                    icon: '🚀',
                    title: '¡Clase de Diagnóstico <span class="wbm-accent">100% GRATIS!</span>',
                    body: 'Descubre el potencial de aprendizaje acelerado. 30+ años de experiencia y más de 200,000 graduados nos respaldan.',
                    cta: '¡Agendar Ahora — Es Gratis!',
                    waMsg: '¡Hola! Me interesa agendar una clase de diagnóstico gratuita 🚀'
                }
            };
            return contents[this._type] || contents.general;
        },

        getBarContent: function () {
            var bars = {
                kids: { emoji: '⭐', text: '¡Inscripciones abiertas! <strong>Cupo limitado</strong> para cursos infantiles este mes' },
                adult: { emoji: '🎯', text: 'Fotolectura y Memoria: <strong>última semana</strong> para inscribirte con descuento' },
                pro: { emoji: '💎', text: 'Programa ejecutivo: <strong>inversión especial</strong> este mes para profesionales' },
                general: { emoji: '🔥', text: '¡Últimos lugares! Clase de diagnóstico <strong>GRATIS</strong> este fin de semana' }
            };
            return bars[this._type] || bars.general;
        },

        getExitContent: function () {
            var exits = {
                kids: {
                    badge: '⏳ ¡Espera, mamá/papá!',
                    title: 'Tu hijo merece <span class="wbm-accent">lo mejor</span>',
                    body: 'No pierdas la oportunidad. Agenda una clase de diagnóstico GRATIS y descubre el potencial oculto de tu hijo.',
                    cta: '¡Sí, quiero la Clase Gratis!',
                    waMsg: '¡Hola! Vi la promoción y me interesa la clase gratis para mi hijo(a) ✨'
                },
                adult: {
                    badge: '⏳ ¡Un momento!',
                    title: 'No dejes tu <span class="wbm-accent">potencial</span> pasar',
                    body: '1 de cada 3 visitantes se inscribe después de la clase gratis. ¿Te lo vas a perder?',
                    cta: '¡Quiero Intentar Sin Costo!',
                    waMsg: '¡Hola! Vi la promoción y quiero intentar la clase de diagnóstico sin costo 🎯'
                },
                general: {
                    badge: '⏳ ¡No te vayas todavía!',
                    title: '¿Sabías que la clase es <span class="wbm-accent">100% GRATIS?</span>',
                    body: 'Sin compromiso, sin cargos ocultos. Solo prueba nuestro método y decide después.',
                    cta: '¡Agendar Clase Gratis Ahora!',
                    waMsg: '¡Hola! Antes de irme, quiero agendar la clase de diagnóstico gratis 🙏'
                }
            };
            return exits[this._type] || exits.general;
        }
    };

    /* ═══════════════════════════════════════════════════════
       GEOLOCATION TARGETING
       ═══════════════════════════════════════════════════════ */

    var GeoTargeting = {
        _city: null,
        _region: null,
        _loaded: false,

        init: function (callback) {
            var self = this;

            // Check cache first
            var cached = Store.get('geo');
            if (cached) {
                self._city = cached.city;
                self._region = cached.region;
                self._loaded = true;
                if (callback) callback(self);
                return;
            }

            // Fetch geolocation
            var xhr = new XMLHttpRequest();
            xhr.open('GET', CONFIG.geoApiUrl, true);
            xhr.timeout = 4000;
            xhr.onload = function () {
                if (xhr.status === 200) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        self._city = data.city || CONFIG.geoFallbackCity;
                        self._region = data.region || '';
                        self._loaded = true;
                        Store.set('geo', { city: self._city, region: self._region }, 24 * 60 * 60 * 1000);
                    } catch (e) {
                        self._city = CONFIG.geoFallbackCity;
                        self._loaded = true;
                    }
                }
                if (callback) callback(self);
            };
            xhr.onerror = xhr.ontimeout = function () {
                self._city = CONFIG.geoFallbackCity;
                self._loaded = true;
                if (callback) callback(self);
            };
            xhr.send();
        },

        getCity: function () {
            return this._city || CONFIG.geoFallbackCity;
        },

        getCampusInfo: function () {
            var city = (this._city || '').toLowerCase();
            if (city.indexOf('cuautitl') !== -1 || city.indexOf('izcalli') !== -1 || city.indexOf('satelite') !== -1 || city.indexOf('naucalpan') !== -1) {
                return { campus: 'Campus Cuautitlán Izcalli', nearby: true };
            }
            if (city.indexOf('méxi') !== -1 || city.indexOf('cdmx') !== -1 || city.indexOf('ciudad') !== -1 || city.indexOf('coyoac') !== -1 || city.indexOf('benito') !== -1) {
                return { campus: 'Campus CDMX', nearby: true };
            }
            return { campus: 'Campus CDMX y Cuautitlán', nearby: false };
        }
    };

    /* ═══════════════════════════════════════════════════════
       COUNTDOWN TIMER
       ═══════════════════════════════════════════════════════ */

    var CountdownTimer = {
        _intervals: [],

        createHTML: function () {
            var container = el('div', { className: 'wbm-countdown' });
            var units = [
                { key: 'days', label: 'Días' },
                { key: 'hours', label: 'Horas' },
                { key: 'mins', label: 'Min' },
                { key: 'secs', label: 'Seg' }
            ];

            for (var i = 0; i < units.length; i++) {
                if (i > 0) container.appendChild(el('span', { className: 'wbm-countdown-sep', textContent: ':' }));
                var unit = el('div', { className: 'wbm-countdown-unit' }, [
                    el('div', { className: 'wbm-countdown-digit', 'data-unit': units[i].key, textContent: '00' }),
                    el('span', { className: 'wbm-countdown-label', textContent: units[i].label })
                ]);
                container.appendChild(unit);
            }
            return container;
        },

        start: function (containerEl) {
            var self = this;
            function update() {
                var now = Date.now();
                var end = CONFIG.countdownEndDate.getTime();
                var diff = Math.max(0, end - now);

                var days = Math.floor(diff / 86400000);
                var hours = Math.floor((diff % 86400000) / 3600000);
                var mins = Math.floor((diff % 3600000) / 60000);
                var secs = Math.floor((diff % 60000) / 1000);

                var digits = containerEl.querySelectorAll('.wbm-countdown-digit');
                var values = [
                    days < 10 ? '0' + days : '' + days,
                    hours < 10 ? '0' + hours : '' + hours,
                    mins < 10 ? '0' + mins : '' + mins,
                    secs < 10 ? '0' + secs : '' + secs
                ];

                for (var i = 0; i < digits.length; i++) {
                    if (digits[i].textContent !== values[i]) {
                        digits[i].textContent = values[i];
                    }
                }
            }

            update();
            var id = setInterval(update, 1000);
            self._intervals.push(id);
        }
    };

    /* ═══════════════════════════════════════════════════════
       FLOATING BAR
       ═══════════════════════════════════════════════════════ */

    var FloatingBar = {
        _el: null,

        init: function () {
            if (Store.has('bar_dismissed')) return;

            var barContent = PageTargeting.getBarContent();
            var self = this;

            var bar = el('div', { className: 'wbm-floating-bar', id: 'wbm-floating-bar' });
            var inner = el('div', { className: 'wbm-bar-inner' });

            inner.appendChild(el('span', {
                className: 'wbm-bar-text', innerHTML:
                    '<span class="wbm-bar-emoji">' + barContent.emoji + '</span> ' + barContent.text
            }));

            var content = PageTargeting.getContent();
            inner.appendChild(el('a', {
                className: 'wbm-bar-cta',
                href: waLink(content.waMsg),
                target: '_blank',
                rel: 'noopener noreferrer',
                textContent: '¡Agenda Ahora!'
            }));

            var closeBtn = el('button', {
                className: 'wbm-bar-close',
                innerHTML: '✕',
                'aria-label': 'Cerrar barra',
                onClick: function () { self.dismiss(); }
            });
            inner.appendChild(closeBtn);

            bar.appendChild(inner);
            document.body.insertBefore(bar, document.body.firstChild);
            this._el = bar;

            setTimeout(function () {
                bar.classList.add('wbm-active');
                document.body.classList.add('wbm-bar-active');
                track('ViewContent', { content_name: 'Floating Bar Shown', content_category: 'Marketing' });
            }, CONFIG.floatingBarDelayMs);
        },

        dismiss: function () {
            if (this._el) {
                this._el.classList.remove('wbm-active');
                document.body.classList.remove('wbm-bar-active');
                Store.set('bar_dismissed', true, CONFIG.floatingBarCooldownHours * 3600000);
                track('ViewContent', { content_name: 'Floating Bar Dismissed', content_category: 'Marketing' });
            }
        }
    };

    /* ═══════════════════════════════════════════════════════
       LIGHTBOX POPUP
       ═══════════════════════════════════════════════════════ */

    var LightboxPopup = {
        _shown: false,
        _el: null,

        init: function () {
            if (Store.has('lightbox_dismissed')) return;

            var self = this;

            // Trigger: scroll depth
            var scrollHandler = function () {
                if (self._shown) return;
                var scrollPercent = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
                if (scrollPercent >= CONFIG.lightboxScrollPercent) {
                    self.show();
                    window.removeEventListener('scroll', scrollHandler);
                }
            };
            window.addEventListener('scroll', scrollHandler, { passive: true });

            // Trigger: time delay
            setTimeout(function () {
                if (!self._shown) {
                    self.show();
                    window.removeEventListener('scroll', scrollHandler);
                }
            }, CONFIG.lightboxDelayMs);
        },

        show: function () {
            if (this._shown) return;
            this._shown = true;

            var self = this;
            var content = PageTargeting.getContent();
            var cityInfo = GeoTargeting.getCampusInfo();

            // Build overlay
            var overlay = el('div', { className: 'wbm-overlay', id: 'wbm-lightbox' });
            var modal = el('div', { className: 'wbm-modal' });

            // Close button
            modal.appendChild(el('button', {
                className: 'wbm-close',
                innerHTML: '✕',
                'aria-label': 'Cerrar',
                onClick: function () { self.dismiss(); }
            }));

            // Geo tag
            if (GeoTargeting._loaded) {
                modal.appendChild(el('div', {
                    className: 'wbm-geo-tag',
                    innerHTML: '📍 ' + GeoTargeting.getCity() + (cityInfo.nearby ? ' — ' + cityInfo.campus : '')
                }));
            }

            // Icon
            modal.appendChild(el('span', { className: 'wbm-modal-icon', textContent: content.icon }));

            // Title
            modal.appendChild(el('h2', { innerHTML: content.title }));

            // Body
            modal.appendChild(el('p', { textContent: content.body }));

            // Countdown
            var countdown = CountdownTimer.createHTML();
            modal.appendChild(countdown);

            // CTA
            modal.appendChild(el('a', {
                className: 'wbm-cta',
                href: waLink(content.waMsg),
                target: '_blank',
                rel: 'noopener noreferrer',
                innerHTML: content.cta + ' <span style="font-size:1.2em">→</span>'
            }));

            // Secondary dismiss
            modal.appendChild(el('button', {
                className: 'wbm-cta-secondary',
                textContent: 'No gracias, tal vez después',
                onClick: function () { self.dismiss(); }
            }));

            overlay.appendChild(modal);

            // Close on backdrop click
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) self.dismiss();
            });

            // Close on Escape
            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    self.dismiss();
                    document.removeEventListener('keydown', escHandler);
                }
            });

            document.body.appendChild(overlay);
            this._el = overlay;

            // Activate with slight delay for CSS transition
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    overlay.classList.add('wbm-active');
                    CountdownTimer.start(countdown);
                });
            });

            track('ViewContent', { content_name: 'Lightbox Popup Shown', content_category: 'Marketing' });
        },

        dismiss: function () {
            if (this._el) {
                this._el.classList.remove('wbm-active');
                Store.set('lightbox_dismissed', true, CONFIG.lightboxCooldownDays * 86400000);
                track('ViewContent', { content_name: 'Lightbox Popup Dismissed', content_category: 'Marketing' });
                var node = this._el;
                setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 500);
            }
        }
    };

    /* ═══════════════════════════════════════════════════════
       EXIT INTENT DETECTION
       ═══════════════════════════════════════════════════════ */

    var ExitIntent = {
        _shown: false,
        _el: null,

        init: function () {
            if (Store.has('exit_shown')) return;

            var self = this;

            // Desktop: mouse leaves viewport toward top
            document.documentElement.addEventListener('mouseleave', function (e) {
                if (e.clientY <= CONFIG.exitIntentSensitivity && !self._shown) {
                    self.show();
                }
            });

            // Mobile: visibility change (switching tab / pressing back)
            document.addEventListener('visibilitychange', function () {
                if (document.visibilityState === 'hidden' && !self._shown) {
                    // Mark for showing when they come back
                    self._pendingShow = true;
                }
                if (document.visibilityState === 'visible' && self._pendingShow && !self._shown) {
                    self._pendingShow = false;
                    self.show();
                }
            });
        },

        show: function () {
            if (this._shown) return;
            // Don't show exit intent if lightbox is already visible
            if (document.querySelector('.wbm-overlay.wbm-active')) return;

            this._shown = true;
            var self = this;
            var content = PageTargeting.getExitContent();

            var overlay = el('div', { className: 'wbm-overlay', id: 'wbm-exit-overlay' });
            var modal = el('div', { className: 'wbm-modal wbm-exit-modal' });

            modal.appendChild(el('button', {
                className: 'wbm-close',
                innerHTML: '✕',
                'aria-label': 'Cerrar',
                onClick: function () { self.dismiss(); }
            }));

            modal.appendChild(el('div', { className: 'wbm-exit-badge', textContent: content.badge }));
            modal.appendChild(el('span', { className: 'wbm-modal-icon', textContent: '🎁' }));
            modal.appendChild(el('h2', { innerHTML: content.title }));
            modal.appendChild(el('p', { textContent: content.body }));

            // Countdown
            var countdown = CountdownTimer.createHTML();
            modal.appendChild(countdown);

            modal.appendChild(el('a', {
                className: 'wbm-cta',
                href: waLink(content.waMsg),
                target: '_blank',
                rel: 'noopener noreferrer',
                innerHTML: content.cta + ' <span style="font-size:1.2em">💬</span>'
            }));

            modal.appendChild(el('button', {
                className: 'wbm-cta-secondary',
                textContent: 'No, prefiero irme',
                onClick: function () { self.dismiss(); }
            }));

            overlay.appendChild(modal);
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) self.dismiss();
            });

            document.addEventListener('keydown', function escHandler(e) {
                if (e.key === 'Escape') {
                    self.dismiss();
                    document.removeEventListener('keydown', escHandler);
                }
            });

            document.body.appendChild(overlay);
            this._el = overlay;

            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    overlay.classList.add('wbm-active');
                    CountdownTimer.start(countdown);
                });
            });

            Store.set('exit_shown', true, 0); // session-only
            track('ViewContent', { content_name: 'Exit Intent Shown', content_category: 'Marketing' });
        },

        dismiss: function () {
            if (this._el) {
                this._el.classList.remove('wbm-active');
                var node = this._el;
                setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 500);
            }
        }
    };

    /* ═══════════════════════════════════════════════════════
       GAMIFIED SPIN WHEEL
       ═══════════════════════════════════════════════════════ */

    var SpinWheel = {
        _shown: false,
        _el: null,

        prizes: [
            { label: '10% OFF', color: '#8b5cf6', weight: 25 },
            { label: 'Clase Gratis', color: '#7c3aed', weight: 20 },
            { label: '15% OFF', color: '#6d28d9', weight: 15 },
            { label: 'Material Extra', color: '#ec4899', weight: 15 },
            { label: '20% OFF', color: '#db2777', weight: 8 },
            { label: 'Ebook Gratis', color: '#f97316', weight: 10 },
            { label: '¡Sorpresa!', color: '#ea580c', weight: 5 },
            { label: '5% OFF', color: '#a78bfa', weight: 2 }
        ],

        init: function () {
            if (Store.has('wheel_played')) return;

            var self = this;
            var shown = false;

            var scrollHandler = function () {
                if (shown) return;
                var scrollPercent = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
                if (scrollPercent >= CONFIG.wheelScrollPercent) {
                    shown = true;
                    // Don't show if lightbox is already visible
                    if (!document.querySelector('.wbm-overlay.wbm-active')) {
                        self.show();
                    }
                    window.removeEventListener('scroll', scrollHandler);
                }
            };
            window.addEventListener('scroll', scrollHandler, { passive: true });
        },

        show: function () {
            if (this._shown) return;
            this._shown = true;

            var self = this;
            var overlay = el('div', { className: 'wbm-overlay', id: 'wbm-wheel-overlay' });
            var modal = el('div', { className: 'wbm-modal' });
            modal.style.maxWidth = '440px';

            modal.appendChild(el('button', {
                className: 'wbm-close',
                innerHTML: '✕',
                'aria-label': 'Cerrar',
                onClick: function () { self.dismiss(); }
            }));

            modal.appendChild(el('span', { className: 'wbm-modal-icon', textContent: '🎰' }));
            modal.appendChild(el('h2', { innerHTML: '¡Gira la Rueda de <span class="wbm-accent">Premios!</span>' }));
            modal.appendChild(el('p', { textContent: '¡Tienes un giro gratis! Descubre tu premio exclusivo.' }));

            // Wheel container
            var wheelWrapper = el('div', { className: 'wbm-wheel-container' });
            var wheel = this._buildWheel();
            wheelWrapper.appendChild(el('div', { className: 'wbm-wheel-pointer' }));
            wheelWrapper.appendChild(wheel);

            var centerBtn = el('button', {
                className: 'wbm-wheel-center',
                textContent: '¡GIRAR!',
                onClick: function () { self.spin(wheel, centerBtn, resultDiv); }
            });
            wheelWrapper.appendChild(centerBtn);

            modal.appendChild(wheelWrapper);

            // Result (hidden initially)
            var resultDiv = el('div', { className: 'wbm-wheel-result' });
            modal.appendChild(resultDiv);

            overlay.appendChild(modal);
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) self.dismiss();
            });

            document.body.appendChild(overlay);
            this._el = overlay;

            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    overlay.classList.add('wbm-active');
                });
            });

            track('ViewContent', { content_name: 'Spin Wheel Shown', content_category: 'Marketing' });
        },

        _buildWheel: function () {
            var wheelEl = el('div', { className: 'wbm-wheel' });
            var segCount = this.prizes.length;
            var segAngle = 360 / segCount;

            for (var i = 0; i < segCount; i++) {
                var seg = el('div', { className: 'wbm-wheel-segment' });
                seg.style.background = this.prizes[i].color;
                seg.style.transform = 'rotate(' + (segAngle * i - 90) + 'deg) skewY(-' + (90 - segAngle) + 'deg)';
                seg.appendChild(el('span', { textContent: this.prizes[i].label }));
                wheelEl.appendChild(seg);
            }

            return wheelEl;
        },

        spin: function (wheelEl, centerBtn, resultDiv) {
            if (wheelEl.classList.contains('wbm-spinning')) return;

            wheelEl.classList.add('wbm-spinning');
            centerBtn.style.pointerEvents = 'none';
            centerBtn.textContent = '...';

            // Pick prize based on weight
            var totalWeight = 0;
            var self = this;
            this.prizes.forEach(function (p) { totalWeight += p.weight; });
            var rand = Math.random() * totalWeight;
            var cumulative = 0;
            var prizeIndex = 0;
            for (var i = 0; i < this.prizes.length; i++) {
                cumulative += this.prizes[i].weight;
                if (rand <= cumulative) { prizeIndex = i; break; }
            }

            var segAngle = 360 / this.prizes.length;
            var targetAngle = 360 - (prizeIndex * segAngle + segAngle / 2);
            var totalRotation = 360 * 5 + targetAngle; // 5 full rotations + target

            wheelEl.style.transform = 'rotate(' + totalRotation + 'deg)';

            setTimeout(function () {
                wheelEl.classList.remove('wbm-spinning');
                var prize = self.prizes[prizeIndex];

                // Show result
                var content = PageTargeting.getContent();
                resultDiv.innerHTML = '';
                resultDiv.appendChild(el('div', { className: 'wbm-prize-badge', innerHTML: '🎉 ' + prize.label }));
                resultDiv.appendChild(el('p', { textContent: '¡Felicidades! Menciona este premio al agendar tu clase para hacerlo válido.' }));
                resultDiv.appendChild(el('a', {
                    className: 'wbm-cta',
                    href: waLink('¡Hola! Gané "' + prize.label + '" en la ruleta de WorldBrain. ¡Quiero canjearlo! 🎉'),
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    innerHTML: '¡Canjear Premio por WhatsApp! 💬'
                }));
                resultDiv.classList.add('wbm-active');

                // Confetti!
                self._launchConfetti();

                Store.set('wheel_played', prize.label, CONFIG.wheelCooldownDays * 86400000);
                track('Lead', { content_name: 'Wheel Prize: ' + prize.label, content_category: 'Gamification' });
            }, 4200);
        },

        _launchConfetti: function () {
            var container = el('div', { className: 'wbm-confetti-container' });
            var colors = ['#8b5cf6', '#ec4899', '#f97316', '#fbbf24', '#10b981', '#3b82f6'];
            var fragment = document.createDocumentFragment();

            for (var i = 0; i < 60; i++) {
                var piece = el('div', { className: 'wbm-confetti-piece' });
                var s = piece.style;
                s.left = Math.random() * 100 + '%';
                s.background = colors[Math.floor(Math.random() * colors.length)];
                s.width = (6 + Math.random() * 8) + 'px';
                s.height = (6 + Math.random() * 8) + 'px';
                s.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
                s.animationDelay = (Math.random() * 1.5) + 's';
                s.animationDuration = (2 + Math.random() * 2) + 's';
                fragment.appendChild(piece);
            }

            container.appendChild(fragment);
            document.body.appendChild(container);

            setTimeout(function () {
                if (container.parentNode) container.parentNode.removeChild(container);
            }, 5000);
        },

        dismiss: function () {
            if (this._el) {
                this._el.classList.remove('wbm-active');
                var node = this._el;
                setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 500);
            }
        }
    };

    /* ═══════════════════════════════════════════════════════
       INITIALIZATION ORCHESTRATOR
       ═══════════════════════════════════════════════════════ */

    function init() {
        // 1. Page targeting (sync)
        PageTargeting.init();

        // 2. Geolocation (async — populates before lightbox shows)
        GeoTargeting.init();

        // 3. Floating Bar
        FloatingBar.init();

        // 4. Lightbox Popup
        LightboxPopup.init();

        // 5. Exit Intent
        ExitIntent.init();

        // 6. Gamified Wheel
        SpinWheel.init();
    }

    /* Wait for DOM */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
