import re
import os
import glob

html_files = glob.glob('*.html')

new_legal_content = """                    <div class="footer-legal">
                        <p style="margin-bottom: 5px; color: #94a3b8; font-size: 0.85rem;">WorldBrain Corporativo Educativo S.A. de C.V. | RFC: XXXXXXXX | Domicilio: Ciudad de México.</p>
                        <p>&copy; 2026 WorldBrain México. Todos los derechos reservados.</p>
                        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-top: 10px;">
                            <a href="terminos.html">Términos y Condiciones</a>
                            <a href="privacidad.html">Aviso de Privacidad</a>
                            <a href="reembolsos.html">Política de Devoluciones y Reembolsos</a>
                        </div>
                    </div>"""

new_fl_legal_content = """            <div class="fl-footer-bottom">
                <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 5px; text-align: center;">WorldBrain Corporativo Educativo S.A. de C.V. | RFC: XXXXXXXX | Domicilio: Ciudad de México.</p>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                    <p>&copy; 2026 WorldBrain México. Todos los derechos reservados.</p>
                    <div class="fl-legal-links" style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                        <a href="terminos.html">Términos y Condiciones</a>
                        <a href="privacidad.html">Aviso de Privacidad</a>
                        <a href="reembolsos.html">Política de Devoluciones y Reembolsos</a>
                    </div>
                </div>
            </div>"""

for filepath in html_files:
    if filepath == 'googleb3cccf1efd67c490.html': continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    # Replace footer-legal class block
    content = re.sub(
        r'<div class="footer-legal">.*?</div>\n\s{16}</div>\n\s{12}</div>',
        new_legal_content + '\n                </div>\n            </div>',
        content,
        flags=re.DOTALL
    )

    # Simplified replace just for the exact element if previous failed
    content = re.sub(
        r'<div class="footer-legal">.*?</div>\n                </div>',
        new_legal_content + '\n                </div>',
        content,
        flags=re.DOTALL
    )
    
    content = re.sub(
        r'<div class="footer-legal">.*?</div>',
        new_legal_content,
        content,
        flags=re.DOTALL
    )

    # Replace fl-footer-bottom block
    content = re.sub(
        r'<div class="fl-footer-bottom">.*?</div>',
        new_fl_legal_content,
        content,
        flags=re.DOTALL
    )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"Skipped {filepath} (No matching footer class)")
