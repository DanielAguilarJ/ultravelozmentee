#!/usr/bin/env python3
"""
Comparador de paridad entre la página real y la nueva.

El port de SEO, tracking, booking y test de lectura es demasiado grande para
hacerlo a ojo: cualquier bloque de JSON-LD o cualquier `data-*` que se quede
por el camino se pierde en silencio y no se nota hasta que cae el posicionamiento
o deja de medirse una conversión.

Esto extrae de las dos páginas lo que de verdad importa y lista lo que falta.
La lista tiene que llegar a cero.
"""
import json
import re
import sys

REAL = "fotolectura.html"
NUEVA = "fotolectura-v4.html"


def leer(p):
    return open(p, encoding="utf-8").read()


def ids(src):
    return set(re.findall(r'\bid="([^"]+)"', src))


def metas(src):
    out = set()
    for m in re.finditer(r'<meta\s+([^>]+)>', src, re.I):
        a = m.group(1)
        k = re.search(r'(?:name|property|http-equiv)="([^"]+)"', a, re.I)
        if k:
            out.add(k.group(1).lower())
    return out


def enlaces(src):
    out = set()
    for m in re.finditer(r'<link\s+([^>]+)>', src, re.I):
        a = m.group(1)
        rel = re.search(r'rel="([^"]+)"', a, re.I)
        if rel:
            r = rel.group(1).lower()
            if r in ("canonical", "alternate", "manifest", "icon", "apple-touch-icon"):
                href = re.search(r'href="([^"]+)"', a, re.I)
                out.add(r + " -> " + (href.group(1) if href else "?"))
            else:
                out.add(r)
    return out


def jsonld(src):
    """Devuelve los @type de cada bloque de datos estructurados."""
    tipos = []
    for m in re.finditer(r'<script[^>]+type="application/ld\+json"[^>]*>([\s\S]*?)</script>', src, re.I):
        cuerpo = m.group(1).strip()
        try:
            d = json.loads(cuerpo)
        except Exception:
            t = re.findall(r'"@type"\s*:\s*"([^"]+)"', cuerpo)
            tipos.extend(t or ["(ilegible)"])
            continue
        for nodo in (d if isinstance(d, list) else [d]):
            if isinstance(nodo, dict):
                g = nodo.get("@graph")
                if isinstance(g, list):
                    for x in g:
                        if isinstance(x, dict) and x.get("@type"):
                            tipos.append(str(x["@type"]))
                elif nodo.get("@type"):
                    tipos.append(str(nodo["@type"]))
    return tipos


def scripts(src):
    return set(re.findall(r'<script[^>]+src="([^"]+)"', src))


def datos(src):
    """Nombres de atributos data-* (los lee el tracking)."""
    return set(a.lower() for a in re.findall(r'\s(data-[a-z0-9-]+)\s*=', src, re.I))


def tracking(src):
    """Identificadores de medición que no pueden perderse."""
    marcas = {
        "gtag AW-10846614576": "AW-10846614576",
        "Meta Pixel 280967147554736": "280967147554736",
        "gtag.js": "googletagmanager.com/gtag/js",
        "meta-pixel.js": "meta-pixel.js",
        "tracking.js": "tracking.js",
        "param-builder-client": "param-builder-client",
        "clientParamBuilder (CAPI)": "clientParamBuilder",
        "booking.js": "booking.js",
        "navbar.min.js": "navbar.min.js",
    }
    return {k: (v in src) for k, v in marcas.items()}


def secciones(src):
    return re.findall(r'<section[^>]+id="([^"]+)"', src)


def main():
    real, nueva = leer(REAL), leer(NUEVA)
    fallos = 0

    def bloque(titulo, faltan, total=None):
        nonlocal fallos
        n = len(faltan)
        fallos += n
        cab = "  %-26s falta %d" % (titulo, n)
        if total is not None:
            cab += " de %d" % total
        print(cab)
        for f in sorted(faltan)[:40]:
            print("      - %s" % f)

    print("PARIDAD  %s  ->  %s\n" % (REAL, NUEVA))

    # Excepción deliberada: la página nueva tiene una sola paleta, así que el
    # selector de tema no existe. Es una retirada buscada, no una pérdida.
    INTENCIONADO = {"navThemeToggle"}
    ir, iv = ids(real), ids(nueva)
    bloque("IDs de elemento", (ir - iv) - INTENCIONADO, len(ir))

    sr, sv = secciones(real), secciones(nueva)
    bloque("secciones", set(sr) - set(sv), len(sr))

    mr, mv = metas(real), metas(nueva)
    bloque("meta", mr - mv, len(mr))

    lr, lv = enlaces(real), enlaces(nueva)
    bloque("link rel", {x for x in lr if x.split(" ->")[0] not in
                        {e.split(" ->")[0] for e in lv}}, len(lr))

    jr, jv = jsonld(real), jsonld(nueva)
    from collections import Counter
    cr, cv = Counter(jr), Counter(jv)
    faltan_ld = []
    for t, n in cr.items():
        if cv.get(t, 0) < n:
            faltan_ld.append("%s (%d en real, %d en nueva)" % (t, n, cv.get(t, 0)))
    bloque("JSON-LD @type", faltan_ld, len(jr))

    scr, scv = scripts(real), scripts(nueva)
    norm = lambda s: re.sub(r"\?v=\d+", "", s)
    bloque("scripts externos",
           {s for s in scr if norm(s) not in {norm(x) for x in scv}}, len(scr))

    dr, dv = datos(real), datos(nueva)
    bloque("atributos data-*", dr - dv, len(dr))

    print("\n  tracking imprescindible:")
    for k, ok in tracking(real).items():
        if not ok:
            continue
        presente = tracking(nueva)[k]
        if not presente:
            fallos += 1
        print("      %s %s" % ("ok  " if presente else "FALTA", k))

    print("\n  TOTAL PENDIENTE: %d" % fallos)
    return 0 if fallos == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
