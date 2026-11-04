# Panama Legal Lab

Este repositorio conserva los cinco sitemaps y el código de entrega de la web en cuatro idiomas.

La referencia actual es [DEPLOYMENT.md](cloudflare/DEPLOYMENT.md). El paquete publicado está en [css-static](cloudflare/frontend/css-static/README.txt), con su [recibo de activación](cloudflare/frontend/css-static/activation-receipt.json). La recuperación [durable-free](cloudflare/frontend/durable-free/README.txt) y todos los archivos anteriores se conservan como historial y reversión.

Sitemaps: [índice](sitemap-index.xml), [español](sitemap-es.xml), [inglés](sitemap-en.xml), [francés](sitemap-fr.xml) e [italiano](sitemap-it.xml).

## Preparar esta copia del código

El CSS original se guarda en gzip y base64 ASCII, sin pérdida, para que GitHub pueda alojarlo. Antes de instalar dependencias, probar o compilar:

```text
cd cloudflare/frontend/css-static
node tooling/prepare-native-css.mjs
node --test tooling/prepare-native-css.test.mjs
```

El primer comando valida el texto base64 canónico, los límites y los hashes de gzip y CSS, y reconstruye las dos rutas CSS fijas. No usa red, no se ejecuta al instalar y no cambia producción. Después seguir el README.txt original del paquete (`npm ci`, pruebas y build). [El recibo](cloudflare/frontend/css-static/activation-receipt.json) contiene la procedencia comprimida y la verificación de todos los fuentes y assets.
