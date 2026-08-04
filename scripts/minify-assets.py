#!/usr/bin/env python3
"""
Regenera css/navbar-unified.min.css y js/navbar.min.js desde sus fuentes.

Existe porque las 26 páginas cargan las variantes .min y este proyecto no
tiene csso ni terser en devDependencies, así que editar solo la fuente no
llegaría al navegador.

No es un minificador de propósito general: hace únicamente las
transformaciones que puede demostrar que son seguras, y ABORTA sin escribir
nada si la verificación no cuadra.

  CSS  · quita comentarios, colapsa espacios y los quita alrededor de
         { } ; , y el ; final antes de }. NO toca los espacios que rodean
         + - * / porque en calc() son obligatorios.
         Verifica: mismo número de bloques, mismos selectores, mismas
         declaraciones (canonizando el espacio tras las comas, que no es
         significativo) y expresiones calc/min/max/clamp idénticas.

  JS   · quita comentarios de bloque y las líneas que solo son //, más la
         sangría. No reescribe código ni renombra nada.
         Verifica: node --check, que sobrevivan todas las cadenas
         literales y que estén los identificadores que el marcado usa.
         Antes comprueba que ningún /* o // viva dentro de una cadena o
         de una expresión regular; si lo encuentra, copia sin minificar.

Uso:   python3 scripts/minify-navbar.py
"""

import os
import re
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CSS_SRC = os.path.join(RAIZ, 'css', 'navbar-unified.css')
CSS_OUT = os.path.join(RAIZ, 'css', 'navbar-unified.min.css')
JS_SRC = os.path.join(RAIZ, 'js', 'navbar.js')
JS_OUT = os.path.join(RAIZ, 'js', 'navbar.min.js')

# Identificadores que el marcado de las páginas usa: si alguno se perdiera,
# el navbar quedaría a medias sin que salte ningún error de sintaxis.
CLAVES_JS = [
    'navHamburger', 'navMobilePanel', 'navMobileOverlay', 'navThemeToggle',
    'mobileDropdownBtn', 'mobileDropdownContent', 'nav-pill', 'nav-dropdown',
    'light-mode', 'nav-locked', 'nav-hidden', 'scrolled',
    'aria-expanded', 'aria-hidden', 'aria-pressed', 'aria-current',
    '__navClose', 'inert',
]


def canon(v):
    """Forma canónica de un valor: el espacio tras una coma no cuenta."""
    return re.sub(r',\s+', ',', re.sub(r'\s+', ' ', v).strip())


def bloques(css):
    """[(selector, {propiedad: valor})] de cada bloque del CSS."""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    salida = []
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        sel = canon(m.group(1))
        sel = re.sub(r'\s*([>+~])\s*', r'\1', sel)
        sel = re.sub(r':\s+', ':', sel)
        cuerpo = {}
        for d in m.group(2).split(';'):
            if ':' not in d:
                continue
            prop, _, val = d.partition(':')
            if prop.strip():
                cuerpo[prop.strip()] = canon(val)
        salida.append((sel, cuerpo))
    return salida


def expresiones_calc(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    return sorted(canon(x) for x in re.findall(r'(?:calc|clamp|min|max)\([^;{}]*', css))


def minificar_css(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    css = re.sub(r'\s+', ' ', css)
    css = re.sub(r'\s*([{};,])\s*', r'\1', css)
    return css.replace(';}', '}').strip()


def haz_css():
    src = open(CSS_SRC, encoding='utf-8').read()

    for m in re.finditer(r'''(["'])(?:\\.|(?!\1).)*\1|url\([^)]*\)''', src):
        if '/*' in m.group(0):
            sys.exit('CSS: hay un /* dentro de una cadena o url(), aborta')

    mini = minificar_css(src)

    a, b = bloques(src), bloques(mini)
    if len(a) != len(b):
        sys.exit(f'CSS: número de bloques distinto ({len(a)} vs {len(b)}), aborta')
    for (s1, d1), (s2, d2) in zip(a, b):
        if s1 != s2:
            sys.exit(f'CSS: selector cambiado: «{s1}» vs «{s2}», aborta')
        if d1 != d2:
            dif = {k: (d1.get(k), d2.get(k)) for k in set(d1) | set(d2) if d1.get(k) != d2.get(k)}
            sys.exit(f'CSS: declaraciones cambiadas en «{s1}»: {dif}, aborta')

    ca, cb = expresiones_calc(src), expresiones_calc(mini)
    if ca != cb:
        sys.exit('CSS: alguna expresión calc/min/max/clamp cambió, aborta')

    open(CSS_OUT, 'w', encoding='utf-8').write(
        '/*! navbar-unified.min.css · generado por scripts/minify-navbar.py */\n' + mini + '\n')

    print(f'  CSS  {len(src)/1024:6.1f} KB → {len(mini)/1024:5.1f} KB  '
          f'(-{100 - 100 * len(mini) / len(src):.0f}%)  '
          f'{len(a)} bloques y {len(ca)} calc() verificados')


def haz_js():
    src = open(JS_SRC, encoding='utf-8').read()

    # ¿Algún /* o // vive dentro de una cadena o de una expresión regular?
    # Se mira sobre la fuente CRUDA, porque de eso depende que sea seguro
    # quitar comentarios.
    cadenas_crudas = [m.group(0) for m in re.finditer(r'''(["'])(?:\\.|(?!\1).)*\1''', src)]
    regex = re.findall(r'/(?![*/])(?:\\.|\[(?:\\.|[^\]])*\]|[^/\\\n])+/[gimsuy]*', src)
    riesgo = [x for x in cadenas_crudas + regex if '/*' in x or '//' in x]

    if riesgo:
        print('  JS   hay comentarios aparentes dentro de literales: se copia sin minificar')
        mini = src
    else:
        t = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
        mini = '\n'.join(
            ln.strip() for ln in t.split('\n')
            if ln.strip() and not ln.strip().startswith('//')
        )

    # Las cadenas que deben sobrevivir son las del CÓDIGO, no las que
    # aparezcan en la prosa de un comentario: un comentario que mencione
    # tabindex="0" no es una cadena literal del programa.
    sin_comentarios = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    sin_comentarios = '\n'.join(
        ln for ln in sin_comentarios.split('\n') if not ln.strip().startswith('//'))
    cadenas = set(m.group(0) for m in re.finditer(
        r'''(["'])(?:\\.|(?!\1).)*\1''', sin_comentarios))

    open(JS_OUT, 'w', encoding='utf-8').write(
        '/*! navbar.min.js · generado por scripts/minify-navbar.py */\n' + mini + '\n')

    r = subprocess.run(['node', '--check', JS_OUT], capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f'JS: node --check falló:\n{r.stderr}')

    salida = open(JS_OUT, encoding='utf-8').read()

    perdidas = [c for c in cadenas if c not in salida]
    if perdidas:
        sys.exit(f'JS: se perdieron cadenas literales: {perdidas[:5]}, aborta')

    ausentes = [k for k in CLAVES_JS if k not in salida]
    if ausentes:
        sys.exit(f'JS: faltan identificadores clave: {ausentes}, aborta')

    print(f'  JS   {len(src)/1024:6.1f} KB → {len(mini)/1024:5.1f} KB  '
          f'(-{100 - 100 * len(mini) / len(src):.0f}%)  '
          f'node --check, {len(cadenas)} cadenas y {len(CLAVES_JS)} claves verificadas')


if __name__ == '__main__':
    haz_css()
    haz_js()
    print('  ✓ listo')
