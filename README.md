# Panama Legal Lab

Este repositorio conserva los cinco sitemaps y el código de entrega en español, inglés, francés e italiano. Google Sites sigue siendo el origen del contenido.

El [recibo de activación](cloudflare/frontend/css-static/activation-receipt.json) registra la recuperación del 6 de noviembre: backend `0507d52a-a3c9-4d18-b8be-f0a6f6703b80` y Pages `06533eae-ba22-4602-8920-631f871dfff1`. La validación anterior rechazaba la configuración nativa de Google de 519 elementos y redirigía a Google Sites. Ahora se admite solo la forma revisada, con controles de URL, idioma, script y nonce; se conservan la compatibilidad histórica de 518 elementos y el fallback ante formas desconocidas.

La auditoría pública comprobó 252 documentos HTTP 200, 63 por idioma, sin fallback, con 252 canonical correctos y 148 descripciones esperadas verificadas. Ocho vistas de portada —cuatro idiomas y dos dispositivos— pasaron los controles, con 24 hashes de fotografía, overlay y logotipo iguales a los baselines del 5 de noviembre. El menú móvil y la apertura/cierre del buscador funcionaron; no se enviaron búsquedas ni formularios.

La [medición PageSpeed de la portada](https://pagespeed.web.dev/analysis/https-www-panamalegallab-com/oxuarv97gj) registró 61 móvil y 82 escritorio, SEO y accesibilidad 100, prácticas 96 y navegación agéntica 2/2 en ambos. El LCP móvil sigue en 9,2 s: la velocidad no se considera terminada. Es una ejecución de laboratorio aislada, sin prueba causal ni CWV de campo. Se mantiene un error CORS de telemetría de Google; las auditorías de consola guardadas no mostraron 403 de imágenes.

La caché de HTML permanece compilada en `off`. Cada visita HTML solicita de nuevo el origen Google mediante Pages y el DO; máximo ocho peticiones en vuelo, sin cola ni trabajos periódicos. Se conserva el plan gratuito, con cuotas finitas, fotografías, teléfono y recursos existentes. Entrega de formularios, conversiones/atribución Analytics y GSC siguen pendientes. Consulta [DEPLOYMENT.md](cloudflare/DEPLOYMENT.md) y el [respaldo anterior f62](cloudflare/frontend/css-static/activation-f62-receipt.json).

Sitemaps conservados: [índice](sitemap-index.xml), [español](sitemap-es.xml), [inglés](sitemap-en.xml), [francés](sitemap-fr.xml) e [italiano](sitemap-it.xml), con sus alternates. No se añade automatización de GitHub ni de sitemaps.

## Preparar el código

Desde `cloudflare/frontend/css-static`, ejecutar `node tooling/prepare-native-css.mjs`. Reconstruye cuatro destinos exactos para los dos CSS desde sus representaciones gzip/base64, sin red ni postinstall. Usar el lockfile existente. En PowerShell:

```powershell
$env:PLL_HTML_CACHE_MODE = 'off'
npm run build
npm test
node --test tooling/*.test.mjs
```

El build rechaza modos de caché distintos de `off`. Los comandos no despliegan ni envían formularios. Los recibos históricos y los archivos raíz y sitemaps se conservan.
