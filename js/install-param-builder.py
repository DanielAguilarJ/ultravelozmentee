"""
Script para inyectar el Meta ParamBuilder del lado del cliente en todos los archivos HTML.
Añade:
1. clientParamBuilder.bundle.js (CDN de Meta) justo después del Meta Pixel Code
2. param-builder-client.js (inicialización) justo antes de </body>
"""
import os
import re

BUNDLE_TAG = '<script src="https://capi-automation.s3.us-east-2.amazonaws.com/public/client_js/capiParamBuilder/clientParamBuilder.bundle.js"></script>'
INIT_TAG = '<script src="js/param-builder-client.js" defer></script>'

MARKER_BUNDLE = 'clientParamBuilder.bundle.js'
MARKER_INIT = 'param-builder-client.js'


def inject_param_builder():
    html_files = [f for f in os.listdir('.') if f.endswith('.html')]
    
    for filename in html_files:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        modified = False
        
        # 1. Inyectar bundle CDN después del Meta Pixel Code
        if MARKER_BUNDLE not in content:
            if '<!-- End Meta Pixel Code -->' in content:
                content = content.replace(
                    '<!-- End Meta Pixel Code -->',
                    f'<!-- End Meta Pixel Code -->\n{BUNDLE_TAG}'
                )
                modified = True
                print(f"  📦  Bundle CDN inyectado en {filename}")
            elif '</head>' in content:
                content = content.replace(
                    '</head>',
                    f'{BUNDLE_TAG}\n</head>'
                )
                modified = True
                print(f"  📦  Bundle CDN inyectado en {filename} (antes de </head>)")
        else:
            print(f"  ⏭️  Bundle CDN ya existe en {filename}")
        
        # 2. Inyectar script de inicialización antes de </body>
        if MARKER_INIT not in content:
            if '</body>' in content:
                content = content.replace(
                    '</body>',
                    f'    {INIT_TAG}\n</body>'
                )
                modified = True
                print(f"  🔧  Init script inyectado en {filename}")
        else:
            print(f"  ⏭️  Init script ya existe en {filename}")
        
        if modified:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅  {filename} actualizado")
        else:
            print(f"⚠️  {filename} sin cambios necesarios")


if __name__ == '__main__':
    inject_param_builder()
    print("\n🎉 Inyección completada.")
