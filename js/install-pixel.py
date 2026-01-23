import os
import sys

def install_pixel(pixel_id):
    pixel_code = f"""<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{{if(f.fbq)return;n=f.fbq=function(){{n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)}};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '{pixel_id}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id={pixel_id}&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->"""

    html_files = [f for f in os.listdir('.') if f.endswith('.html')]
    
    for filename in html_files:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Limpiar versión anterior si existe par evitar duplicados o confusión de nombres
        if "Facebook Pixel Code" in content:
            import re
            content = re.sub(r'<!-- Facebook Pixel Code -->.*?<!-- End Facebook Pixel Code -->', '', content, flags=re.DOTALL)
            print(f"♻️  Actualizando formato de Facebook a Meta en {filename}")

        if "Meta Pixel Code" in content:
            print(f"⚠️  El Meta Pixel ya está correctamente instalado en {filename}. Saltando...")
            continue
            
        if "</head>" in content:
            new_content = content.replace("</head>", f"{pixel_code}\n</head>")
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✅  Meta Pixel instalado en {filename}")
        else:
            print(f"❌  No se encontró la etiqueta </head> en {filename}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: Debes proporcionar un Pixel ID.")
        sys.exit(1)
    
    install_pixel(sys.argv[1])
