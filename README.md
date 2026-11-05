# Panama Legal Lab

Este repositorio conserva los cinco sitemaps y el código de entrega en español, inglés, francés e italiano. Google Sites sigue siendo el origen del contenido.

El [recibo de recuperación](cloudflare/frontend/css-static/activation-receipt.json) identifica la versión activa `f62aeb5b-7e37-4bf1-9633-0985f1f4060e`, con HTML cache compilado en `off`. Cinco vistas públicas en cuatro idiomas registraron 97 transferencias de imágenes HTTP 200, sin imágenes rotas. La revisión española a los 234,604 segundos recibió URL nuevas y mantuvo los mismos hashes de fotografías y logotipo. La reutilización de HTML se retiró después de comprobar imágenes válidas a los 2 segundos y tokens rotos a los 159 segundos. Cada visita HTML vuelve a solicitar contenido fresco: una ejecución Pages, una llamada al DO y una petición al origen Google. Las cuotas gratuitas siguen siendo finitas; se mantienen máximo ocho peticiones en vuelo, sin cola ni trabajos periódicos.

Las cuatro políticas de imágenes, CSS, registro nativo y render inicial permanecen en `all`. Se conservan fotografías, frontend Pages y recursos existentes. El render inicial retira un enlace exacto a una fuente inválida, añade carga diferida nativa al iframe reconocido de Apps Script y reserva la proporción del logotipo de portada cuando falta.

Consulta [DEPLOYMENT.md](cloudflare/DEPLOYMENT.md) para evidencia, límites y preparación. Se conservan exactos los recibos históricos [cf48 con caché](cloudflare/frontend/css-static/activation-cf48-cache-all-receipt.json), [7ff](cloudflare/frontend/css-static/activation-7ff-receipt.json) y [f550](cloudflare/frontend/css-static/activation-f550-receipt.json). La [medición PageSpeed](https://pagespeed.web.dev/analysis/https-www-panamalegallab-com/543kcq01on) registró 56 móvil y 78 escritorio, sin los errores 403 de imágenes anteriores. Es una ejecución externa aislada; el rendimiento móvil sigue abierto y no se declara terminada la optimización. Entrega de formularios, conversiones/atribución Analytics y GSC quedan pendientes.

Se descartó el experimento de imágenes adaptables: cuatro vistas tempranas sugerían ahorros limitados, pero una prueba separada de giro a los 160,013 segundos eligió nueve URL de 1280 px no solicitadas antes y las nueve fallaron con 403. No se adoptó código experimental. Una posible separación de CSS crítico sigue siendo solo un plan, sin implementar.

Sitemaps: [índice](sitemap-index.xml), [español](sitemap-es.xml), [inglés](sitemap-en.xml), [francés](sitemap-fr.xml) e [italiano](sitemap-it.xml). Sus alternates `hreflang` se conservan. No se observaron etiquetas `hreflang` en el head HTML público ni de preview.

## Preparar el código

Desde `cloudflare/frontend/css-static`, ejecutar `node tooling/prepare-native-css.mjs` antes de build/tests. Reconstruye dos copias CSS exactas desde gzip/base64, comprobando límites y hashes, sin red. Usar el lockfile. En PowerShell:

```powershell
$env:PLL_HTML_CACHE_MODE = 'off'
npm run build
npm test
```

La configuración `config/backend.cache-off.wrangler.json` conserva las cuatro políticas en `all`; el modo de HTML cache lo fija la compilación. Los comandos no publican cambios ni envían formularios.
