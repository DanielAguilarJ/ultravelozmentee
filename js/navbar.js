/**
 * NAVBAR PILL UNIFICADO · WorldBrain México
 *
 * Desplazamiento, desplegable, panel móvil, tema y anclas.
 *
 * Cada bloque se aísla en un try/catch propio: si el marcado de una
 * página no trae alguna pieza, el resto del navbar sigue funcionando en
 * lugar de caerse entero en la primera excepción.
 */

(function () {
    'use strict';

    var doc = document;
    var html = doc.documentElement;

    /* Envoltorio de módulo: un fallo aquí no puede dejar la página sin
       menú. */
    function mod(name, fn) {
        try {
            fn();
        } catch (err) {
            if (window.console && console.warn) {
                console.warn('[navbar] módulo «' + name + '» falló:', err);
            }
        }
    }

    var nav = doc.querySelector('.nav-pill');
    var hamburger = doc.getElementById('navHamburger');
    var panel = doc.getElementById('navMobilePanel');
    var overlay = doc.getElementById('navMobileOverlay');
    var themeToggle = doc.getElementById('navThemeToggle');
    var dropdown = doc.querySelector('.nav-dropdown');
    var dropdownBtn = dropdown ? dropdown.querySelector('.nav-pill-link') : null;
    var mobileDropdownBtn = doc.getElementById('mobileDropdownBtn');
    var mobileDropdownContent = doc.getElementById('mobileDropdownContent');

    var reduceMotion = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : { matches: false };

    /* ══════════════════════════════════════════════
       1 · Estado de desplazamiento
       Añade .scrolled y, en pantallas cortas, esconde la píldora al
       bajar. Se lee scrollY dentro de un rAF para no forzar layout en
       cada evento.
       ══════════════════════════════════════════════ */
    mod('scroll', function () {
        if (!nav) return;

        var last = window.pageYOffset || 0;
        var ticking = false;

        /* Solo se esconde donde 52 px de píldora pesan: pantallas
           cortas o teléfonos. En escritorio siempre queda a la vista. */
        function puedeEsconder() {
            return window.innerHeight <= 820 || window.innerWidth <= 900;
        }

        function update() {
            var y = window.pageYOffset || 0;

            if (y > 50) nav.classList.add('scrolled');
            else nav.classList.remove('scrolled');

            /* No se esconde si hay un menú abierto: dejaría al usuario
               sin el botón para cerrarlo. */
            var abierto = (panel && panel.classList.contains('active')) ||
                (dropdown && dropdown.classList.contains('open'));

            if (!abierto && puedeEsconder() && !reduceMotion.matches) {
                /* El umbral de 8 px evita que un temblor del dedo o el
                   rebote elástico del final la hagan parpadear. */
                if (y > last + 8 && y > 140) {
                    nav.classList.add('nav-hidden');
                } else if (y < last - 8) {
                    nav.classList.remove('nav-hidden');
                }
            } else {
                nav.classList.remove('nav-hidden');
            }

            last = y;
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }, { passive: true });

        update();
    });

    /* ══════════════════════════════════════════════
       2 · Desplegable de escritorio
       ══════════════════════════════════════════════ */
    mod('dropdown', function () {
        if (!dropdown || !dropdownBtn) return;

        var cierre;

        function abrir(si) {
            dropdown.classList.toggle('open', si);
            dropdownBtn.setAttribute('aria-expanded', si ? 'true' : 'false');
        }

        dropdownBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            abrir(!dropdown.classList.contains('open'));
        });

        dropdown.addEventListener('mouseleave', function () {
            cierre = setTimeout(function () { abrir(false); }, 200);
        });

        dropdown.addEventListener('mouseenter', function () {
            clearTimeout(cierre);
        });

        doc.addEventListener('click', function (e) {
            if (!dropdown.contains(e.target)) abrir(false);
        });

        /* Escape cierra y devuelve el foco al botón, que es de donde
           salió: si no, el foco se queda en un menú ya invisible. */
        doc.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape' || !dropdown.classList.contains('open')) return;
            abrir(false);
            dropdownBtn.focus();
        });

        /* Tabular fuera del menú lo cierra. */
        dropdown.addEventListener('focusout', function (e) {
            if (!e.relatedTarget) return;
            if (!dropdown.contains(e.relatedTarget)) abrir(false);
        });
    });

    /* ══════════════════════════════════════════════
       3 · Panel móvil
       ══════════════════════════════════════════════ */
    mod('panel', function () {
        if (!hamburger || !panel) return;

        var ANCLAS = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
        var soportaInert = 'inert' in HTMLElement.prototype;
        var devolverFoco = null;
        var scrollGuardado = 0;

        /* Sacar el panel cerrado del orden de tabulación.

           Con `inert` basta una propiedad. Sin él hay que poner
           tabindex="-1" a mano, y entonces importa GUARDAR el valor
           original: la versión anterior hacía removeAttribute, así que
           un elemento con tabindex="0" legítimo lo perdía para
           siempre tras el primer cierre. */
        function inhabilitar(si) {
            panel.setAttribute('aria-hidden', si ? 'true' : 'false');

            if (soportaInert) {
                panel.inert = si;
                return;
            }

            var els = panel.querySelectorAll(ANCLAS + ', [tabindex]');
            Array.prototype.forEach.call(els, function (el) {
                if (si) {
                    if (!el.hasAttribute('data-nav-tabindex')) {
                        el.setAttribute('data-nav-tabindex',
                            el.hasAttribute('tabindex') ? el.getAttribute('tabindex') : '');
                    }
                    el.setAttribute('tabindex', '-1');
                } else {
                    var prev = el.getAttribute('data-nav-tabindex');
                    if (prev === null) return;
                    if (prev === '') el.removeAttribute('tabindex');
                    else el.setAttribute('tabindex', prev);
                    el.removeAttribute('data-nav-tabindex');
                }
            });
        }

        /* Bloquear el fondo sin perder la posición.

           `overflow: hidden` en <html> basta en los navegadores
           actuales, pero Safari en iOS puede saltar al principio, así
           que la posición se guarda y se restaura a mano. Antes se
           escribía body.style.overflow directamente, lo que además
           pisaba cualquier valor en línea que la página tuviera. */
        function bloquear(si) {
            if (si) {
                scrollGuardado = window.pageYOffset || 0;
                html.classList.add('nav-locked');
            } else {
                html.classList.remove('nav-locked');
                window.scrollTo(0, scrollGuardado);
            }
        }

        function abrir() {
            devolverFoco = doc.activeElement;
            hamburger.classList.add('active');
            panel.classList.add('active');
            if (overlay) overlay.classList.add('active');
            hamburger.setAttribute('aria-expanded', 'true');
            inhabilitar(false);
            bloquear(true);

            /* Llevar el foco dentro del panel: si se queda en la
               hamburguesa, el primer Tab se va al contenido de detrás,
               que está tapado por el velo. */
            var primero = panel.querySelector(ANCLAS);
            if (primero) {
                requestAnimationFrame(function () { primero.focus(); });
            }
        }

        function cerrar() {
            hamburger.classList.remove('active');
            panel.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            inhabilitar(true);
            bloquear(false);

            if (devolverFoco && devolverFoco.focus) devolverFoco.focus();
            else hamburger.focus();
            devolverFoco = null;
        }

        /* Estado inicial: cerrado y fuera del orden de tabulación. */
        inhabilitar(true);

        hamburger.addEventListener('click', function () {
            if (panel.classList.contains('active')) cerrar();
            else abrir();
        });

        if (overlay) overlay.addEventListener('click', cerrar);

        /* Un enlace del panel navega; el botón del acordeón, no. */
        Array.prototype.forEach.call(
            panel.querySelectorAll('a:not(.mobile-dropdown-toggle)'),
            function (a) { a.addEventListener('click', cerrar); }
        );

        doc.addEventListener('keydown', function (e) {
            if (!panel.classList.contains('active')) return;

            if (e.key === 'Escape') {
                cerrar();
                return;
            }

            /* Trampa de foco: el tabulador circula dentro del panel
               mientras está abierto. Sin esto se puede tabular al
               contenido de detrás, que está oculto tras el velo. */
            if (e.key !== 'Tab') return;

            var focos = Array.prototype.filter.call(
                panel.querySelectorAll(ANCLAS),
                function (el) {
                    return el.offsetWidth > 0 || el.offsetHeight > 0 || el === doc.activeElement;
                }
            );
            if (!focos.length) return;

            var primero = focos[0];
            var ultimo = focos[focos.length - 1];

            if (e.shiftKey && doc.activeElement === primero) {
                e.preventDefault();
                ultimo.focus();
            } else if (!e.shiftKey && doc.activeElement === ultimo) {
                e.preventDefault();
                primero.focus();
            }
        });

        /* Al pasar a escritorio, cerrar: la fila de enlaces vuelve y el
           panel abierto quedaría flotando sin su botón visible. */
        var t;
        window.addEventListener('resize', function () {
            clearTimeout(t);
            t = setTimeout(function () {
                if (window.innerWidth > 900 && panel.classList.contains('active')) cerrar();
                if (dropdown) {
                    dropdown.classList.remove('open');
                    if (dropdownBtn) dropdownBtn.setAttribute('aria-expanded', 'false');
                }
            }, 150);
        });

        /* Expuesto para que el módulo de anclas pueda cerrar el panel. */
        window.__navClose = cerrar;
    });

    /* ══════════════════════════════════════════════
       4 · Acordeón del panel
       ══════════════════════════════════════════════ */
    mod('acordeon', function () {
        if (!mobileDropdownBtn || !mobileDropdownContent) return;

        if (!mobileDropdownBtn.hasAttribute('aria-expanded')) {
            mobileDropdownBtn.setAttribute('aria-expanded', 'false');
        }

        mobileDropdownBtn.addEventListener('click', function (e) {
            e.preventDefault();
            var abierto = mobileDropdownContent.classList.toggle('active');
            mobileDropdownBtn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
            var icono = mobileDropdownBtn.querySelector('i');
            if (icono) icono.style.transform = abierto ? 'rotate(180deg)' : '';
        });
    });

    /* ══════════════════════════════════════════════
       5 · Tema

       Solo se aplica la preferencia GUARDADA. La del sistema se deja
       en manos del script en línea que ya traen algunas páginas para
       evitar el parpadeo inicial: aplicarla también aquí encendería el
       tema claro en páginas que no tienen tokens claros definidos, y
       el navbar se aclararía sobre una página que seguiría oscura.

       Lo que sí se corrige: la versión anterior solo sabía AÑADIR
       light-mode. Si el script de la página lo había puesto por
       preferencia del sistema y el usuario había elegido «oscuro»
       explícitamente, esa elección se ignoraba. Ahora un valor
       guardado manda en los dos sentidos.
       ══════════════════════════════════════════════ */
    mod('tema', function () {
        if (!themeToggle) return;

        var guardado = null;
        try { guardado = localStorage.getItem('theme'); } catch (e) { /* modo privado */ }

        if (guardado === 'light') html.classList.add('light-mode');
        else if (guardado === 'dark') html.classList.remove('light-mode');

        function anunciar() {
            var esClaro = html.classList.contains('light-mode');
            themeToggle.setAttribute('aria-pressed', esClaro ? 'true' : 'false');
            themeToggle.setAttribute('aria-label',
                esClaro ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
        }

        anunciar();

        themeToggle.addEventListener('click', function () {
            var esClaro = html.classList.toggle('light-mode');
            try { localStorage.setItem('theme', esClaro ? 'light' : 'dark'); } catch (e) { }
            anunciar();
        });
    });

    /* ══════════════════════════════════════════════
       6 · Página actual

       El marcado ya trae aria-current en el desplegable, pero no en la
       fila de la píldora. Se deduce de la URL para que la página en la
       que estás se vea marcada sin tener que editar 26 archivos.
       ══════════════════════════════════════════════ */
    mod('actual', function () {
        if (!nav) return;

        var aqui = location.pathname.replace(/\/+$/, '').replace(/\.html$/, '');
        if (!aqui) aqui = '/';

        var enlaces = doc.querySelectorAll('.nav-pill a[href], .nav-mobile-panel a[href]');
        Array.prototype.forEach.call(enlaces, function (a) {
            var href = a.getAttribute('href') || '';
            if (!href || href.charAt(0) === '#' || /^(https?:|mailto:|tel:)/.test(href)) return;

            var ruta = href.split('#')[0].split('?')[0]
                .replace(/\/+$/, '').replace(/\.html$/, '');
            if (!ruta) ruta = '/';

            if (ruta === aqui) {
                a.setAttribute('aria-current', 'page');
                /* Si el enlace vive dentro del desplegable, marcar
                   también el botón que lo abre. */
                var dd = a.closest ? a.closest('.nav-dropdown') : null;
                if (dd) {
                    var btn = dd.querySelector('.nav-pill-link');
                    if (btn) btn.setAttribute('aria-current', 'page');
                }
            }
        });
    });

    /* ══════════════════════════════════════════════
       7 · Anclas

       El desplazamiento se calcula midiendo la píldora en vez de usar
       los 90 px fijos de antes: con la barra promocional visible la
       píldora baja a 60 px y el destino quedaba tapado.
       ══════════════════════════════════════════════ */
    mod('anclas', function () {
        function separacion() {
            if (!nav) return 24;
            var r = nav.getBoundingClientRect();
            /* Alto de la píldora más su distancia real al borde, más un
               respiro. Si está escondida, r.bottom es negativo. */
            return Math.max(24, r.height + Math.max(0, r.top) + 16);
        }

        doc.addEventListener('click', function (e) {
            var a = e.target.closest ? e.target.closest('a[href*="#"]') : null;
            if (!a) return;

            var href = a.getAttribute('href') || '';
            var i = href.indexOf('#');
            if (i === -1) return;

            var hash = href.substring(i);
            if (hash === '#') return;

            /* Solo anclas de esta misma página. */
            var ruta = href.substring(0, i);
            var actual = location.pathname.split('/').pop();
            if (ruta && ruta !== actual &&
                ruta.replace(/\.html$/, '') !== actual.replace(/\.html$/, '')) return;

            var destino;
            try { destino = doc.querySelector(hash); } catch (err) { return; }
            if (!destino) return;

            e.preventDefault();
            if (window.__navClose) window.__navClose();

            var y = destino.getBoundingClientRect().top + (window.pageYOffset || 0) - separacion();

            window.scrollTo({
                top: Math.max(0, y),
                behavior: reduceMotion.matches ? 'auto' : 'smooth'
            });

            /* El foco tiene que seguir al destino o quien navega con
               teclado sigue donde estaba. tabindex="-1" lo hace
               enfocable sin meterlo en el orden de tabulación. */
            if (!destino.hasAttribute('tabindex')) {
                destino.setAttribute('tabindex', '-1');
            }
            destino.focus({ preventScroll: true });

            if (history.pushState) history.pushState(null, '', hash);
        });
    });

})();
