# Panama Legal Lab

Este repositorio conserva los cinco sitemaps y el código de entrega de la web en cuatro idiomas.

La entrega actual está documentada en [DEPLOYMENT.md](cloudflare/DEPLOYMENT.md). El código está en [css-static](cloudflare/frontend/css-static/README.txt), manteniendo su ruta existente, y su [recibo de activación](cloudflare/frontend/css-static/activation-receipt.json) identifica la versión aceptada. El backend reutiliza HTML público durante un máximo de cinco minutos dentro del Durable Object existente. Cada visita HTML sigue invocando Pages y el Durable Object; se reduce el trabajo de origen/render cuando hay una copia válida.

Se conservan las fotografías, el CSS exacto, el plan gratuito, los bindings y el historial. La recuperación [durable-free](cloudflare/frontend/durable-free/README.txt) y las versiones anteriores permanecen disponibles.

Sitemaps: [índice](sitemap-index.xml), [español](sitemap-es.xml), [inglés](sitemap-en.xml), [francés](sitemap-fr.xml) e [italiano](sitemap-it.xml).

## Preparar esta copia del código

El CSS original está almacenado sin pérdida en gzip y base64 ASCII. Antes de instalar dependencias, probar o compilar:

```text
cd cloudflare/frontend/css-static
node tooling/prepare-native-css.mjs
node --test tooling/prepare-native-css.test.mjs
```

El helper reconstruye únicamente las dos rutas CSS fijas tras validar límites y hashes. No usa red ni se ejecuta automáticamente. Después seguir el [README del paquete](cloudflare/frontend/css-static/README.txt): dependencias bloqueadas, pruebas y build. Para reproducir el backend aceptado se debe definir explícitamente `PLL_HTML_CACHE_MODE=all` antes de compilar; el modo por defecto es `off`. Estos pasos no publican cambios ni añaden automatizaciones.
