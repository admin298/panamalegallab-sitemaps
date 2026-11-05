# Panama Legal Lab

Este repositorio conserva los cinco sitemaps y el código de entrega de la web en español, inglés, francés e italiano. Google Sites sigue siendo el origen del contenido.

La última corrección de registro aceptada está identificada en el [recibo de activación](cloudflare/frontend/css-static/activation-receipt.json): backend `7ffb8661-8eeb-459f-8264-89288caf15fb`, con `PLL_NATIVE_IMPRESSIONS=all`. Las muestras finitas aceptadas no observaron llamadas al registro nativo de impresiones de Google Sites. Se conserva la configuración de GA4 y consentimiento; esa comprobación no demuestra entrega de eventos Analytics.

El paquete mantiene su ruta [css-static](cloudflare/frontend/css-static/README.txt). Se conservan fotografías, CSS, Pages, namespaces, exports del DO y bindings de servicios/almacenamiento existentes. La variable de política sí se añade al entorno y aparece como binding de configuración en la API. No se crean recursos ni bindings de recursos. La propuesta adicional para las imágenes de banca no superó los criterios fijados y no se incorpora; se mantienen las fotografías actuales.

La entrega puede reutilizar HTML válido por un máximo absoluto de300 segundos dentro del DO existente. Cada visita HTML sigue invocando Pages y el DO; las cuotas gratuitas de cuenta siguen siendo finitas. No hay tareas periódicas, calentadores ni sincronización automática con GitHub.

Consulta [DEPLOYMENT.md](cloudflare/DEPLOYMENT.md) para modos, evidencia, límites y reversión. Se conserva exacto el [recibo anterior f550](cloudflare/frontend/css-static/activation-f550-receipt.json). Esta copia no publica cambios por sí misma.

Sitemaps: [índice](sitemap-index.xml), [español](sitemap-es.xml), [inglés](sitemap-en.xml), [francés](sitemap-fr.xml) e [italiano](sitemap-it.xml).

## Preparar el código

Desde `cloudflare/frontend/css-static`, ejecutar explícitamente `node tooling/prepare-native-css.mjs` antes de build/tests. Reconstruye únicamente las dos copias CSS exactas desde gzip/base64 sin pérdida, tras comprobar límites y hashes. No usa red ni se ejecuta automáticamente.

Usar las dependencias del lockfile. Definir `PLL_HTML_CACHE_MODE=all` antes de `npm run build` para reproducir el backend aceptado; el default compilado es `off`. Seguir el README del paquete para pruebas y cobertura. Estos pasos no despliegan recursos ni envían formularios.
