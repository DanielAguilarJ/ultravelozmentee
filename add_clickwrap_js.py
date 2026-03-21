import re

files = ["mathekids.html", "fotolectura.html", "robotics.html", "homeschool.html"]

checkbox_html = """
                    <div class="legal-checkbox-group" style="text-align: left; background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid rgba(0,0,0,0.1);">
                        <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 0.8rem; color: inherit; line-height: 1.4;">
                            <input type="checkbox" class="acepto-terminos-global" style="margin-top: 3px; min-width: 16px; min-height: 16px;">
                            <span>He leído y acepto los <a href="terminos.html" target="_blank" style="text-decoration: underline;">Términos y Condiciones</a>, la <a href="privacidad.html" target="_blank" style="text-decoration: underline;">Política de Privacidad</a> y la <a href="reembolsos.html" target="_blank" style="text-decoration: underline;">Política de Devoluciones y Reembolsos</a>. Entiendo que, una vez iniciado el curso conforme a lo ofrecido y puesto el servicio a mi disposición, no procederá reembolso por falta de uso imputable a mí, sin perjuicio de los derechos que me reconoce la Ley Federal de Protección al Consumidor.</span>
                        </label>
                    </div>
"""

clickwrap_script = """
    <script>
    // Clickwrap Validation Script
    document.addEventListener("DOMContentLoaded", function() {
        // Enlazar checkbox global con botones de WhatsApp de intención de compra
        var ctas = document.querySelectorAll('a[href*="wa.me"]:not(.floating-whatsapp)');
        ctas.forEach(function(cta) {
            cta.addEventListener('click', function(e) {
                var container = cta.closest('section') || cta.closest('div.container') || cta.closest('div.hero-content') || document;
                var check = container.querySelector('.acepto-terminos-global');
                // Si hay un checkbox en la misma sección, lo validamos
                if(check && !check.checked) {
                    e.preventDefault();
                    alert("Por requerimiento de PROFECO, debes aceptar los Términos, Condiciones y Políticas de Reembolso marcando la casilla antes de continuar con tu inscripción o agendamiento.");
                }
            });
        });
    });
    </script>
"""

# Implement price transparency
price_note = """
                        <p class="price-note" style="font-size: 0.75rem; color: #64748b; margin-top: 10px; font-style: italic;">
                            *Precios expresados en Moneda Nacional (MXN) e incluyen IVA. Aplican términos y condiciones vigentes.
                        </p>
"""

for file in files:
    try:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Insert clickwrap script before </body>
        if 'Clickwrap Validation' not in content:
            content = content.replace('</body>', f'{clickwrap_script}\n</body>')

        # Find main CTA to insert checkbox above it
        if 'mk-ce-cta-wrap' in content and 'legal-checkbox-group' not in content: 
            content = content.replace('<div class="mk-ce-cta-wrap">', f'<div class="mk-ce-cta-wrap">\n{checkbox_html}')
        elif 'fl-hero-cta' in content and 'legal-checkbox-group' not in content:
            content = content.replace('<div class="fl-hero-cta">', f'<div class="fl-hero-cta">\n{checkbox_html}')
        elif 'hero-cta' in content and 'legal-checkbox-group' not in content:
            content = content.replace('<div class="hero-cta">', f'<div class="hero-cta">\n{checkbox_html}')
            
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Updated {file}")
            
    except Exception as e:
        print(f"Failed {file} - {e}")
