
import os
import re

# ═══════════════════════════════════════════════════════════
# COMPONENT DEFINITION: Global Social Proof Footer
# ═══════════════════════════════════════════════════════════

testimonial_footer_html = '''
<!-- Global Social Proof Footer -->
<div class="global-social-proof-footer" style="padding: 4rem 0; background: #0a0a0b; border-top: 1px solid rgba(255,255,255,0.05);">
    <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 1.5rem;">
        <div style="text-align: center; margin-bottom: 3rem;">
            <p style="color: #3b82f6; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; font-size: 0.8rem; margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif;">Resultados Probados</p>
            <h2 style="color: white; font-family: 'Outfit', sans-serif; font-size: clamp(1.5rem, 4vw, 2.2rem); margin-bottom: 1rem;">Historias que inspiran acción.</h2>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 3rem;">
            <!-- Card 1: Elena Villalobos -->
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: 20px; transition: transform 0.3s ease;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                    <img src="https://i.pravatar.cc/150?u=elena" alt="Dra. Elena Villalobos" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <h4 style="color: white; margin: 0; font-size: 1rem; font-family: 'Outfit', sans-serif;">Dra. Elena Villalobos</h4>
                        <p style="color: #64748b; margin: 0; font-size: 0.8rem;">Pediatra · Madre de Mateo</p>
                    </div>
                </div>
                <div style="color: #3b82f6; font-family: 'JetBrains Mono', monospace; font-size: 1.2rem; margin-bottom: 1rem; font-weight: 700;">6.2 → 9.1 <span style="font-size: 0.7rem; color: #64748b;">PROMEDIO</span></div>
                <p style="color: #cbd5e1; font-style: italic; line-height: 1.6; font-size: 0.95rem;">"El promedio de Mateo saltó de 6.2 a 9.1 en solo 4 semanas. La inversión se pagó sola en el segundo mes."</p>
            </div>

            <!-- Card 2: Alejandro Torres -->
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: 20px; transition: transform 0.3s ease;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                    <img src="https://i.pravatar.cc/150?u=alejandro" alt="Alejandro Torres" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <h4 style="color: white; margin: 0; font-size: 1rem; font-family: 'Outfit', sans-serif;">Alejandro Torres</h4>
                        <p style="color: #64748b; margin: 0; font-size: 0.8rem;">Dir. Operaciones · TechLogistics</p>
                    </div>
                </div>
                <div style="color: #3b82f6; font-family: 'JetBrains Mono', monospace; font-size: 1.2rem; margin-bottom: 1rem; font-weight: 700;">34 MIN <span style="font-size: 0.7rem; color: #64748b;">300 PÁGINAS</span></div>
                <p style="color: #cbd5e1; font-style: italic; line-height: 1.6; font-size: 0.95rem;">"WorldBrain me enseñó a leer 300 páginas en 34 minutos con retención real. Ahora devoro 2 libros por semana."</p>
            </div>

            <!-- Card 3: Silvia Ortiz -->
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: 20px; transition: transform 0.3s ease;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                    <img src="https://i.pravatar.cc/150?u=silvia" alt="Silvia Ortiz" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <h4 style="color: white; margin: 0; font-size: 1rem; font-family: 'Outfit', sans-serif;">Silvia Ortiz</h4>
                        <p style="color: #64748b; margin: 0; font-size: 0.8rem;">Mamá de Diego · COMIPEMS</p>
                    </div>
                </div>
                <div style="color: #3b82f6; font-family: 'JetBrains Mono', monospace; font-size: 1.2rem; margin-bottom: 1rem; font-weight: 700;">118 / 128 <span style="font-size: 0.7rem; color: #64748b;">ACIERTOS</span></div>
                <p style="color: #cbd5e1; font-style: italic; line-height: 1.6; font-size: 0.95rem;">"Mi hijo sacó 118 de 128 y quedó en Prepa 6 UNAM gracias a Fotolectura y súper-memoria."</p>
            </div>
        </div>

        <div style="text-align: center;">
            <a href="testimonios.html" style="display: inline-block; background: #2563eb; color: white; padding: 1rem 2.5rem; border-radius: 50px; text-decoration: none; font-weight: 700; transition: all 0.3s ease; box-shadow: 0 10px 20px rgba(37,99,235,0.2); font-family: 'Outfit', sans-serif;">
                Ver más casos de éxito <i class="fas fa-arrow-right" style="margin-left: 0.5rem;"></i>
            </a>
        </div>
    </div>
</div>
'''

# List of files to exclude from the process
exclude_files = ['testimonios.html', 'googleb3cccf1efd67c490.html']

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Search for any variation of the old footer cta
    pattern_fl = r'<div class="fl-footer-cta-persuasivo".*?</div>'
    pattern_modern = r'<div class="footer-cta-persuasivo".*?</div>'
    
    # Replacement logic
    new_content = re.sub(pattern_fl, testimonial_footer_html, content, flags=re.DOTALL)
    new_content = re.sub(pattern_modern, testimonial_footer_html, new_content, flags=re.DOTALL)

    # Special case: cosmic-footer (ciencia-astronomia.html)
    if '<footer class="cosmic-footer">' in new_content and 'global-social-proof-footer' not in new_content:
        # Find where to inject if CTA wasn't found - Inject after footer opens
        new_content = new_content.replace('<div class="footer-content">', 
                                          f'<div class="footer-content">\n{testimonial_footer_html}')

    # If still not injected, try falling back to finding the footer container
    if 'global-social-proof-footer' not in new_content:
        patterns_footer = [
            (r'(<footer.*?>\s*<div class="container">)', r'\1\n' + testimonial_footer_html),
            (r'(<footer.*?>\s*<div class="fl-footer-grid">)', r'\1\n' + testimonial_footer_html),
            (r'(<footer.*?>)', r'\1\n' + testimonial_footer_html)
        ]
        
        for pat, repl in patterns_footer:
            if re.search(pat, new_content):
                new_content = re.sub(pat, repl, new_content, 1)
                break

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

# Main execution
html_files = [f for f in os.listdir('.') if f.endswith('.html') and f not in exclude_files]
updated_count = 0

for hfile in html_files:
    if process_file(hfile):
        print(f"✅ Updated: {hfile}")
        updated_count += 1
    else:
        print(f"⚠️  Skipped/Already Updated: {hfile}")

print(f"\\nTOTAL UPDATED: {updated_count} files.")
