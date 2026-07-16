#!/bin/bash

# Script para insertar el Pixel de Facebook en todos los archivos .html
# Uso: ./insert-pixel.sh TU_PIXEL_ID

if [ -z "$1" ]; then
    echo "Error: Debes proporcionar un Pixel ID."
    echo "Uso: ./insert-pixel.sh 1234567890"
    exit 1
fi

PIXEL_ID=$1
PIXEL_CODE="<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '$PIXEL_ID');
fbq('track', 'PageView');
</script>
<noscript><img height=\"1\" width=\"1\" style=\"display:none\"
src=\"https://www.facebook.com/tr?id=$PIXEL_ID&ev=PageView&noscript=1\"
/></noscript>
<!-- End Facebook Pixel Code -->"

# Buscar todos los archivos .html y añadir el código antes de </head>
for file in *.html; do
    if [ -f "$file" ]; then
        if grep -q "Facebook Pixel Code" "$file"; then
            echo "⚠️  El Pixel ya parece estar instalado en $file. Saltando..."
        else
            # Insertar antes de </head> utilizando perl (más robusto para multilínea en macOS/Linux)
            perl -i -pe "BEGIN{undef $/;} s/(<\/head>)/$PIXEL_CODE\n\$1/g" "$file"
            echo "✅  Pixel instalado en $file"
        fi
    fi
done

echo "🎉 ¡Proceso completado! El Pixel ID $PIXEL_ID ha sido integrado en todos los archivos HTML."
