
import os
import re

html_files = [f for f in os.listdir('.') if f.endswith('.html') and f != 'testimonios.html']

cta_block_modern = '''
            <div class="footer-cta-persuasivo" style="background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 1rem; margin-bottom: 3rem; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
                <h3 style="color: white; font-family: 'Outfit', sans-serif; font-size: 1.5rem; margin-bottom: 1rem;">¿Aún con dudas?</h3>
                <p style="font-size: 1.1rem; color: #cbd5e1; margin-bottom: 1.5rem; max-width: 600px; margin-left: auto; margin-right: auto;">Únete a las más de 10,000 personas que ya transformaron su vida. Descubre sus historias aquí y toma acción hoy.</p>
                <a href="testimonios.html" style="display: inline-block; background: var(--primary); color: white; padding: 0.8rem 2rem; border-radius: 2rem; text-decoration: none; font-weight: 600; transition: background 0.3s; box-shadow: 0 4px 15px rgba(37,99,235,0.3);">Ver Casos de Éxito</a>
            </div>
'''

cta_block_fl = '''
            <div class="fl-footer-cta-persuasivo" style="background: rgba(255,255,255,0.05); padding: 2rem; border-radius: 1rem; margin-bottom: 3rem; border: 1px solid rgba(255,255,255,0.1); text-align: center; grid-column: 1 / -1;">
                <h3 style="color: white; font-family: 'Outfit', sans-serif; font-size: 1.5rem; margin-bottom: 1rem;">¿Aún con dudas?</h3>
                <p style="font-size: 1.1rem; color: #cbd5e1; margin-bottom: 1.5rem; max-width: 600px; margin-left: auto; margin-right: auto;">Únete a las más de 10,000 personas que ya transformaron su vida. Descubre sus historias aquí y toma acción hoy.</p>
                <a href="testimonios.html" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 0.8rem 2rem; border-radius: 2rem; text-decoration: none; font-weight: 600; transition: transform 0.3s; box-shadow: 0 4px 15px rgba(37,99,235,0.3);">Ver Casos de Éxito</a>
            </div>
'''

def inject_cta(content, filename):
    # Ya inyectamos si existe la clase para evitar duplicados
    if 'footer-cta-persuasivo' in content or 'fl-footer-cta-persuasivo' in content:
        return content

    # Strategy 1: fl-footer (used in index, admision, fotolectura, etc.)
    if '<footer class="fl-footer"' in content:
        # Inject right after <div class="fl-footer-grid">
        content = content.replace('<div class="fl-footer-grid">', 
                                  f'<div class="fl-footer-grid">\n{cta_block_fl}')
        
    # Strategy 2: footer-modern (used in blogs)
    elif '<footer class="footer-modern"' in content:
        # Inject right after <div class="container"> inside footer
        # Find footer section
        match = re.search(r'<footer class="footer-modern"[^>]*>.*?<div class="container">', content, re.DOTALL)
        if match:
            replacement = match.group(0) + f"\n{cta_block_modern}"
            content = content.replace(match.group(0), replacement)

    # Strategy 3: cosmic-footer (ciencia-astronomia)
    elif '<footer class="cosmic-footer">' in content:
         match = re.search(r'<footer class="cosmic-footer">.*?<div class="footer-content">', content, re.DOTALL)
         if match:
             replacement = match.group(0) + f"\n{cta_block_modern}"
             content = content.replace(match.group(0), replacement)
             
    # Strategy 4: Generic footer replacements for remaining files
    elif '<footer' in content:
        # Find first container inside footer
        match = re.search(r'<footer[^>]*>.*?<div class="container">', content, re.DOTALL)
        if match:
            replacement = match.group(0) + f"\n{cta_block_modern}"
            content = content.replace(match.group(0), replacement)

    return content

for filename in html_files:
    if filename == "googleb3cccf1efd67c490.html": continue
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        updated = inject_cta(content, filename)
        
        if updated != content:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(updated)
            print(f"Injected CTA in {filename}")
    except Exception as e:
        print(f"Error processing {filename}: {e}")
