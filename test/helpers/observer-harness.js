'use strict';

/* ══════════════════════════════════════════════════════════════
   Harness de observadores para /lectoescritura

   Monta el entorno jsdom que js/lectoescritura-adapter.js necesita
   e instrumenta MutationObserver ANTES de cargar el script, para
   convertir el bucle infinito en un contraejemplo legible.

   Cómo evita que la suite se cuelgue: al superar el presupuesto de
   invocaciones se registra la violación, se llama a disconnect() de
   ese observer y se deja de invocar el callback original. NO se lanza
   una excepción dentro del callback: jsdom la reporta al virtual
   console, la cola de microtareas sigue drenándose y el proceso se
   cuelga igual que el navegador.
   ══════════════════════════════════════════════════════════════ */

var fs = require('node:fs');
var path = require('node:path');
var jsdom = require('jsdom');

var JSDOM = jsdom.JSDOM;
var VirtualConsole = jsdom.VirtualConsole;

/* Un sincronizador correcto necesita 1 invocación por mutación
   externa; el margen cubre encadenamientos legítimos. */
var MAX_SETTLE_INVOCATIONS = 5;

/* Presupuesto de aborto: 10× el margen anterior. Superarlo es la
   firma del bucle que congela la pestaña. */
var ABORT_INVOCATION_BUDGET = 50;

var REPO_ROOT = path.resolve(__dirname, '..', '..');
var ADAPTER_PATH = path.join(REPO_ROOT, 'js', 'lectoescritura-adapter.js');
var DEMO_PATH = path.join(REPO_ROOT, 'js', 'lecto-demo.js');

var VIOLATION_BUG_CONDITION = 'escribe-un-atributo-de-su-propio-attributeFilter';
var VIOLATION_BUDGET = 'presupuesto-de-invocaciones-agotado';

function describeTarget(window, element) {
    if (!element) return '(sin objetivo)';
    if (element === window.document.documentElement) return 'documentElement';
    if (element === window.document) return 'document';
    if (element.id) return '#' + element.id;

    return element.tagName ? element.tagName.toLowerCase() : String(element);
}

function normalizeFilter(options) {
    if (!options || options.attributes !== true) return [];
    if (!options.attributeFilter) return null; /* null = observa TODOS */

    return options.attributeFilter.map(function (name) {
        return String(name).toLowerCase();
    });
}

function isObservedNode(record, element) {
    if (!record.target || !element) return false;
    if (element === record.target) return true;

    return record.options.subtree === true &&
        record.target.contains(element);
}

function attributeIsWatched(record, name) {
    if (record.watchedAttributes === null) return true;

    return record.watchedAttributes.indexOf(name) !== -1;
}

function formatWrite(write) {
    if (write.removal) {
        return 'removeAttribute(' + write.name + ')' +
            (write.previous === null ? ' [no existía]' : '');
    }

    return write.name + '="' + write.value + '"' +
        (write.previous === write.value ? ' [valor idéntico al anterior]' : '');
}

function formatViolation(violation) {
    var filter = violation.attributeFilter === null
        ? 'TODOS los atributos'
        : '[' + violation.attributeFilter.join(', ') + ']';

    return [
        violation.kind,
        ' · callback: ' + violation.callbackName + '()',
        ' · nodo observado: ' + violation.targetLabel,
        ' · attributeFilter: ' + filter,
        ' · invocaciones: ' + violation.invocations +
            (violation.budget ? ' (presupuesto ' + violation.budget + ')' : ''),
        ' · escribe: ' + (violation.writes.length
            ? violation.writes.join(', ')
            : '(nada)'),
        ' · intersección writes ∩ attributeFilter: ' +
            (violation.intersection.length
                ? '{' + violation.intersection.join(', ') + '}'
                : '∅')
    ].join('\n      ');
}

function createHarness(options) {
    var settings = options || {};

    var state = {
        mobileViewport: settings.mobileViewport !== false,
        reducedMotion: settings.reducedMotion === true,
        scrollY: settings.scrollY || 0,
        budget: settings.budget || ABORT_INVOCATION_BUDGET,
        writeStack: [],
        observers: [],
        violations: [],
        mediaQueryLists: [],
        errors: []
    };

    var virtualConsole = new VirtualConsole();

    virtualConsole.on('jsdomError', function (error) {
        state.errors.push(error && error.message ? error.message : String(error));
    });

    virtualConsole.on('error', function (message) {
        state.errors.push(String(message));
    });

    var dom = new JSDOM(settings.html, {
        runScripts: 'dangerously',
        /* Habilita requestAnimationFrame, que usa requestStickyUpdate(). */
        pretendToBeVisual: true,
        url: 'https://worldbrain.test/lectoescritura',
        virtualConsole: virtualConsole
    });

    var window = dom.window;
    var document = window.document;

    patchEnvironment(window, state);
    instrumentAttributeWrites(window, state);
    instrumentMutationObserver(window, state);

    function loadScript(file) {
        window.eval(fs.readFileSync(file, 'utf8'));
    }

    function flush(ticks) {
        var pending = typeof ticks === 'number' ? ticks : 3;

        return (function next(remaining) {
            if (remaining <= 0) return Promise.resolve();

            return new Promise(function (resolve) {
                setTimeout(resolve, 0);
            }).then(function () {
                return next(remaining - 1);
            });
        })(pending);
    }

    function observersOf(targetId) {
        return state.observers.filter(function (record) {
            return record.targetId === targetId;
        });
    }

    function snapshot(label) {
        return {
            phase: label || '',
            violations: state.violations.slice(),
            observers: state.observers.map(function (record) {
                return {
                    callbackName: record.callbackName,
                    targetLabel: record.targetLabel,
                    targetId: record.targetId,
                    attributeFilter: record.watchedAttributes,
                    invocations: record.invocations,
                    writes: record.writeNames.slice(),
                    intersection: record.intersection.slice(),
                    aborted: record.aborted
                };
            }),
            errors: state.errors.slice()
        };
    }

    function resetCounters() {
        state.violations.length = 0;
        state.errors.length = 0;

        state.observers.forEach(function (record) {
            record.invocations = 0;
            record.writeNames.length = 0;
            record.writeDetails.length = 0;
            record.intersection.length = 0;
            record.aborted = false;
        });
    }

    return {
        MAX_SETTLE_INVOCATIONS: MAX_SETTLE_INVOCATIONS,
        ABORT_INVOCATION_BUDGET: state.budget,
        /* false en jsdom: el adapter no añade 'lecto-enhanced' y
           lecto-demo.js recorre su rama de fallback del reveal. */
        hasIntersectionObserver: state.hasIntersectionObserver,
        dom: dom,
        window: window,
        document: document,
        observers: state.observers,
        violations: state.violations,
        errors: state.errors,

        loadAdapter: function () {
            loadScript(ADAPTER_PATH);
        },

        /* js/lecto-demo.js es autónomo: se puede cargar sin el adapter. */
        loadDemo: function () {
            loadScript(DEMO_PATH);
        },

        flush: flush,
        observersOf: observersOf,

        observerFor: function (targetId) {
            return observersOf(targetId)[0] || null;
        },

        snapshot: snapshot,
        resetCounters: resetCounters,

        setScroll: function (y) {
            state.scrollY = y;
            window.dispatchEvent(new window.Event('scroll'));
        },

        setMobileViewport: function (isMobile) {
            state.mobileViewport = isMobile !== false;

            state.mediaQueryLists.forEach(function (list) {
                list.dispatchChange();
            });
        },

        /* jsdom no hace layout: getBoundingClientRect siempre da ceros. */
        setRect: function (element, rect) {
            element.getBoundingClientRect = function () {
                return Object.assign(
                    { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 },
                    rect
                );
            };
        },

        report: function () {
            return state.violations.map(formatViolation).join('\n\n');
        },

        close: function () {
            window.close();
        }
    };
}

/* ─────────────────────────────────────────────
   Parches de entorno que jsdom no implementa
   ───────────────────────────────────────────── */

function patchEnvironment(window, state) {
    /* jsdom no implementa scrollIntoView y syncBookingSteps(true) lo llama. */
    window.Element.prototype.scrollIntoView = function () {};

    /* jsdom no evalúa media queries: no existe window.matchMedia. */
    window.matchMedia = function (query) {
        var media = String(query);
        var listeners = [];

        var list = {
            media: media,
            onchange: null,
            addEventListener: function (type, listener) {
                if (type === 'change' && typeof listener === 'function') {
                    listeners.push(listener);
                }
            },
            removeEventListener: function (type, listener) {
                var index = listeners.indexOf(listener);
                if (type === 'change' && index !== -1) listeners.splice(index, 1);
            },
            addListener: function (listener) {
                list.addEventListener('change', listener);
            },
            removeListener: function (listener) {
                list.removeEventListener('change', listener);
            },
            dispatchEvent: function () {
                list.dispatchChange();

                return true;
            },
            dispatchChange: function () {
                var event = { type: 'change', media: media, matches: list.matches };

                if (typeof list.onchange === 'function') list.onchange(event);

                listeners.slice().forEach(function (listener) {
                    listener(event);
                });
            }
        };

        Object.defineProperty(list, 'matches', {
            enumerable: true,
            get: function () {
                if (/prefers-reduced-motion/.test(media)) {
                    return state.reducedMotion;
                }

                if (/max-width/.test(media)) {
                    return state.mobileViewport;
                }

                return false;
            }
        });

        state.mediaQueryLists.push(list);

        return list;
    };

    /* window.scrollY es de solo lectura en jsdom. */
    ['scrollY', 'pageYOffset'].forEach(function (name) {
        Object.defineProperty(window, name, {
            configurable: true,
            get: function () {
                return state.scrollY;
            }
        });
    });

    /* jsdom no trae IntersectionObserver: el adapter no añade
       'lecto-enhanced' y lecto-demo.js usa su rama de fallback
       (añade is-visible a todos los .reveal). Se deja tal cual
       para ejercitar exactamente ese camino. */
    state.hasIntersectionObserver = 'IntersectionObserver' in window;
}

/* ─────────────────────────────────────────────
   Captura de escrituras de atributos
   ───────────────────────────────────────────── */

function instrumentAttributeWrites(window, state) {
    var proto = window.Element.prototype;
    var nativeSetAttribute = proto.setAttribute;
    var nativeRemoveAttribute = proto.removeAttribute;

    function currentWrites() {
        return state.writeStack.length
            ? state.writeStack[state.writeStack.length - 1]
            : null;
    }

    proto.setAttribute = function (name, value) {
        var writes = currentWrites();

        if (writes) {
            writes.push({
                element: this,
                name: String(name).toLowerCase(),
                value: String(value),
                previous: this.getAttribute(name),
                removal: false
            });
        }

        return nativeSetAttribute.call(this, name, value);
    };

    proto.removeAttribute = function (name) {
        var writes = currentWrites();

        if (writes) {
            writes.push({
                element: this,
                name: String(name).toLowerCase(),
                value: null,
                previous: this.getAttribute(name),
                removal: true
            });
        }

        return nativeRemoveAttribute.call(this, name);
    };
}

/* ─────────────────────────────────────────────
   Instrumentación de MutationObserver
   ───────────────────────────────────────────── */

function instrumentMutationObserver(window, state) {
    var NativeMutationObserver = window.MutationObserver;

    function InstrumentedMutationObserver(callback) {
        var record = {
            callbackName: (callback && callback.name) || 'callbackAnónimo',
            target: null,
            targetId: null,
            targetLabel: '(sin observe)',
            options: null,
            watchedAttributes: [],
            invocations: 0,
            writeNames: [],
            writeDetails: [],
            intersection: [],
            aborted: false
        };

        var observer = new NativeMutationObserver(function (records) {
            record.invocations += 1;

            if (record.invocations > state.budget) {
                if (!record.aborted) {
                    record.aborted = true;

                    state.violations.push({
                        kind: VIOLATION_BUDGET,
                        callbackName: record.callbackName,
                        targetLabel: record.targetLabel,
                        targetId: record.targetId,
                        attributeFilter: record.watchedAttributes,
                        invocations: record.invocations,
                        budget: state.budget,
                        writes: record.writeDetails.slice(),
                        intersection: record.intersection.slice()
                    });
                }

                /* Cortar el bucle sin lanzar dentro del callback. */
                observer.disconnect();

                return;
            }

            var writes = [];

            state.writeStack.push(writes);

            try {
                callback.call(observer, records, observer);
            } finally {
                state.writeStack.pop();
            }

            registerWrites(record, writes, state);
        });

        var nativeObserve = observer.observe.bind(observer);

        observer.observe = function (target, observeOptions) {
            record.target = target;
            record.targetId = target && target.id ? target.id : '';
            record.targetLabel = describeTarget(window, target);
            record.options = observeOptions || {};
            record.watchedAttributes = normalizeFilter(record.options);

            if (state.observers.indexOf(record) === -1) {
                state.observers.push(record);
            }

            return nativeObserve(target, observeOptions);
        };

        return observer;
    }

    InstrumentedMutationObserver.prototype = NativeMutationObserver.prototype;

    window.MutationObserver = InstrumentedMutationObserver;
}

function registerWrites(record, writes, state) {
    var newIntersection = [];

    writes.forEach(function (write) {
        /* Solo cuentan las escrituras sobre el nodo observado
           (o sus descendientes, si subtree: true). */
        if (!isObservedNode(record, write.element)) return;

        var detail = formatWrite(write);

        if (record.writeDetails.indexOf(detail) === -1) {
            record.writeDetails.push(detail);
        }

        if (record.writeNames.indexOf(write.name) === -1) {
            record.writeNames.push(write.name);
        }

        if (
            attributeIsWatched(record, write.name) &&
            record.intersection.indexOf(write.name) === -1
        ) {
            record.intersection.push(write.name);
            newIntersection.push(write.name);
        }
    });

    if (newIntersection.length) {
        state.violations.push({
            kind: VIOLATION_BUG_CONDITION,
            callbackName: record.callbackName,
            targetLabel: record.targetLabel,
            targetId: record.targetId,
            attributeFilter: record.watchedAttributes,
            invocations: record.invocations,
            budget: null,
            writes: record.writeDetails.slice(),
            intersection: newIntersection.slice()
        });
    }
}

module.exports = {
    createHarness: createHarness,
    formatViolation: formatViolation,
    MAX_SETTLE_INVOCATIONS: MAX_SETTLE_INVOCATIONS,
    ABORT_INVOCATION_BUDGET: ABORT_INVOCATION_BUDGET,
    VIOLATION_BUG_CONDITION: VIOLATION_BUG_CONDITION,
    VIOLATION_BUDGET: VIOLATION_BUDGET,
    ADAPTER_PATH: ADAPTER_PATH,
    DEMO_PATH: DEMO_PATH
};
