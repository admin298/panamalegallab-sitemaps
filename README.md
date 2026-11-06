# Panama Legal Lab

Este repositorio conserva los cinco sitemaps y el código de entrega en español, inglés, francés e italiano. Google Sites sigue siendo el origen del contenido.

El [recibo de activación](cloudflare/frontend/css-static/activation-receipt.json) identifica el backend `87feb3fd-50c1-4865-884e-49074049f706` y Pages `f8843680-6120-47cb-93fe-1324addffd64`, aceptados el 6 de noviembre a las 15:38:49 UTC. La nueva política limita a 1280 px la fotografía nativa de cabecera en móvil, cambiando solo las dos referencias coincidentes de CSS y del literal del preloader nativo. Conserva la misma fotografía y composición; la resolución de escritorio permanece igual. No añade JavaScript al cliente, peticiones, proxy de imágenes, recursos de pago ni trabajos periódicos.

La comprobación pública cubrió 252 URL preferidas —248 con referencias de cabecera ajustadas y cuatro legales sin fotografía— y cuatro sondas adicionales de dispositivo, sin errores ni reintentos. Dieciséis vistas de navegador sobre ocho URL de portada y páginas comerciales, cuatro idiomas y dos dispositivos, pasaron con el contrato de teléfono revisado. No se rellenaron ni enviaron formularios ni se enviaron consultas de búsqueda; el navegador quedó cerrado. Son 256 comprobaciones HTTP y 16 vistas de navegador, no 252 auditorías de navegador o velocidad.

Se conservó el resultado original del canary: ocho de 16 vistas pasaron; los ocho fallos exigían teléfono visible en páginas comerciales que tampoco lo tenían en los baselines. Una enmienda prospectiva verificó el número correcto en portada y la ausencia comercial conservada. La tanda separada de 16 vistas pasó sin cambiar el candidato; el fallo original sigue en el historial.

En seis parejas contrabalanceadas de laboratorio sobre la portada española móvil, el LCP mejoró en las seis, con ganancia mediana de 460 ms. El FCP empeoró una mediana de 8 ms, máximo 48 ms. El cuerpo descargado de la fotografía se redujo aproximadamente un 19,16 %, por debajo del objetivo del 20 %. Un caso de documento ya caliente conservó la imagen tras 190 segundos y tres cambios de viewport; no prueba una nueva descarga tardía ni otros casos.

La [última medición PageSpeed de portada](https://pagespeed.web.dev/analysis/https-www-panamalegallab-com/j9yhkxkllr) registró 57 móvil —LCP 14,6 s— y 82 escritorio —LCP 2,7 s—; SEO y accesibilidad 100, prácticas 96 y navegación agéntica 2/2 en ambos. La medición anterior a esta versión fue 61/82, con LCP móvil 9,2 s. Esta observación posterior es peor en móvil; ambas son ejecuciones externas sin comparación controlada ni atribución causal. No se afirma mejora global de PageSpeed, CWV de campo ni optimización terminada.

La caché HTML permanece compilada en `off`: cada visita HTML ejecuta Pages y el DO y vuelve a solicitar el origen Google. Máximo ocho peticiones en vuelo, sin cola; las cuotas gratuitas siguen siendo finitas. Las cuatro políticas anteriores y `PLL_HERO_WIDTH` están en `all`. La compatibilidad revisada de 519 elementos, el contrato histórico de 518 y el fallback ante formas desconocidas permanecen. Consulta [DEPLOYMENT.md](cloudflare/DEPLOYMENT.md) y el [recibo anterior 0507](cloudflare/frontend/css-static/activation-0507-receipt.json). Entrega de formularios, conversiones/atribución Analytics y GSC siguen pendientes.

Sitemaps conservados: [índice](sitemap-index.xml), [español](sitemap-es.xml), [inglés](sitemap-en.xml), [francés](sitemap-fr.xml) e [italiano](sitemap-it.xml), con sus alternates. No se añade automatización de GitHub ni de sitemaps.

Desde `cloudflare/frontend/css-static`, ejecutar explícitamente `node tooling/prepare-native-css.mjs`: reconstruye cuatro destinos CSS exactos desde dos inputs gzip/base64, sin red ni postinstall. Usar el lockfile existente y compilar con caché desactivada:

```powershell
$env:PLL_HTML_CACHE_MODE = 'off'
npm run build
npm test
node --test tooling/*.test.mjs
```

La copia portable pasó 196/196 pruebas en una ejecución; los siete artefactos coinciden con el candidato congelado. La evidencia anterior del helper sigue en 28/28, sin afirmar 80 % de cobertura del helper. Estos comandos no despliegan ni envían formularios.
