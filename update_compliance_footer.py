import os
import glob
import re

html_files = glob.glob('*.html')

new_footer = """    <!-- Footer Global (Minimal) -->
    <footer class="footer-modern" role="contentinfo"
        style="margin-top: 0; padding-top: 40px; border-top: 1px solid rgba(255,255,255,0.05); background: #070511;">
        <div class="container">
            <div class="footer-bottom-row" style="margin-top: 0; padding-top: 20px; border-top: none;">
                <div class="footer-brand-area">
                    <span class="brand-text">WorldBrain</span>
                    <div class="social-links">
                        <a href="https://www.facebook.com/WorldBrainMx/" target="_blank" rel="noopener noreferrer"
                            aria-label="Síguenos en Facebook"><i class="fab fa-facebook-f"></i></a>
                        <a href="https://www.instagram.com/worldbrainmx1/" target="_blank" rel="noopener noreferrer"
                            aria-label="Síguenos en Instagram"><i class="fab fa-instagram"></i></a>
                        <a href="https://youtube.com/@worldbrainmexico" target="_blank" rel="noopener noreferrer"
                            aria-label="Síguenos en YouTube"><i class="fab fa-youtube"></i></a>
                        <a href="https://tiktok.com/@worldbrainmexico" target="_blank" rel="noopener noreferrer"
                            aria-label="Síguenos en TikTok"><i class="fab fa-tiktok"></i></a>
                    </div>
                </div>
                <div class="footer-legal">
                    <p style="margin-bottom: 5px; color: #94a3b8; font-size: 0.9rem;">WorldBrain Corporativo Educativo S.A. de C.V. | RFC: XXXXXXXX | Domicilio: Ciudad de México.</p>
                    <p style="margin-bottom: 10px;">&copy; 2026 WorldBrain México. Todos los derechos reservados.</p>
                    <div class="legal-links" style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 10px;">
                        <a href="terminos.html" style="color: #a855f7;">Términos y Condiciones</a>
                        <a href="privacidad.html" style="color: #a855f7;">Aviso de Privacidad</a>
                        <a href="reembolsos.html" style="color: #a855f7;">Devoluciones y Reembolsos</a>
                    </div>
                </div>
            </div>
        </div>
    </footer>"""

for filepath in html_files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match existing 'Footer Global'
    pattern = r'<!-- Footer Global \(Minimal\) -->.*?</footer>'
    if re.search(pattern, content, re.DOTALL):
        updated_content = re.sub(pattern, new_footer, content, flags=re.DOTALL)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        print(f"Updated footer in {filepath}")
    else:
        print(f"Footer not found in {filepath} (Might use a different footer layout)")
