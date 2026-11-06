# Cloudflare: recuperación de compatibilidad del 6 de noviembre

El [recibo](frontend/css-static/activation-receipt.json) identifica el backend `0507d52a-a3c9-4d18-b8be-f0a6f6703b80`, 426995 bytes, SHA-256 `c809b29d397633fd05a9d595f6b9d3032ed013b39ef05a4f06a38dd8109bf340`, con tráfico al 100 %, y Pages `06533eae-ba22-4602-8920-631f871dfff1`. El renderer actual se identifica como `ab2390e634808742a87beddd19bce908eef3d7ac5ea5375dc709d99a7e546a07`; ya no se presenta como el renderer histórico 58.

## Corrección y límites

La configuración nativa observada pasó a 519 elementos. La validación estricta anterior rechazaba esa forma y emitía `302` con `X-PLL-Delivery: google-source-fallback`. Se admite únicamente la forma revisada: cero final, campos y URL esperados, script nativo exacto por idioma y nonce válido coincidente. Se conserva el contrato histórico de 518 elementos. Las formas desconocidas mantienen el fallback de seguridad; no hay aceptación genérica de futuras revisiones.

Se actualizan los contratos exactos de los cuatro scripts nativos y el CSS actual. Los contratos anteriores permanecen. Los cuerpos de los scripts de Google no se incluyen en el repositorio. Las políticas de imágenes, CSS, registro nativo y render inicial siguen en `all`; no cambian las fotografías, el teléfono ni las funciones de formulario. La política nativa sigue limitada al campo reconocido de impresiones; conservar GA4, dataLayer y consentimiento no prueba conversiones ni atribución.

La caché HTML permanece `off`. Cada visita ejecuta Pages, llama al DO y solicita el HTML al origen Google. No reutiliza plantillas ni encola renovaciones. Se mantienen máximo ocho peticiones en vuelo, sin cola, las mismas variables y bindings de recursos, SQLite y reglas. No se añaden migraciones, servicios de pago ni trabajos periódicos. Las cuotas del plan gratuito son finitas; no se garantiza la latencia del origen. Los límites antiguos de 300 segundos/32 entradas quedan como capacidad dormida del código.

## Evidencia pública

La auditoría finita comprobó 252 URL preferidas únicas —63 por idioma— con HTTP 200, versión y renderer correctos, BYPASS y cero fallback. Se verificaron 252 canonical y las 148 descripciones esperadas por la tabla editorial. Es una auditoría HTTP de documentos; no son 252 pruebas de navegador, imágenes, velocidad, formularios ni indexación de Google.

Ocho vistas públicas de portada, cuatro idiomas por móvil/escritorio, pasaron los controles. Sus 24 comprobaciones de fotografía, overlay y logotipo coinciden por hash con los baselines del 5 de noviembre; las imágenes inline registradas se decodificaron sin roturas. Menús móviles y apertura/cierre del buscador pasaron; no se escribieron consultas ni se enviaron formularios. Los ocho contextos y el navegador se cerraron. Antes de publicar se conservaron los cuatro fallos originales del oracle móvil y se corrigió su espera de animación en cuatro vistas adicionales: ocho combinaciones aceptadas, doce vistas acotadas, sin cambiar el candidato.

La [ejecución PageSpeed oxuarv97gj](https://pagespeed.web.dev/analysis/https-www-panamalegallab-com/oxuarv97gj) de la portada registró 61 móvil/82 escritorio; SEO 100, accesibilidad 100, prácticas 96 y navegación agéntica 2/2 en ambos. LCP: 9,2 s móvil y 2,6 s escritorio. Es un reporte de laboratorio aislado; la velocidad móvil sigue pendiente, sin comparación causal ni prueba de CWV de campo. Las auditorías de consola guardadas muestran CORS de `play.google.com/log`, sin 403 de imágenes en esas capturas. Formularios, conversiones/atribución y GSC permanecen fuera de esta aceptación.

## Código y portabilidad

El [recibo de build](frontend/css-static/source-build-proof.json) conserva el delta de 26 archivos respecto de f62: 17 modificados y nueve añadidos. El backend y los seis archivos Pages se reconstruyen con sus hashes exactos. El `_worker.js` frontend permanece en 3349 bytes, SHA-256 `3d7351a56f2729327f85ecf350e0c4729689b882c11c8b294d4aa771d87f08e9`.

La procedencia actual cubre 27 archivos del renderer y una referencia reproducible nueva de 314229 bytes. `renderer/reference-worker-58.js` y el vendor histórico se conservan exactos; la identidad 58 queda como historia. La suite del candidato pasó 179 pruebas, cobertura de `src` de 99,68 % líneas, 89,19 % ramas y 94,76 % funciones. La copia portable conserva además dos guardas históricas. El audit oficial del operador informó cero vulnerabilidades y 83 dependencias, sin cambios del lockfile.

Cada CSS se guarda una sola vez como gzip/base64 canónico. El anterior conserva SHA-256 `7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61` y 1954605 bytes; el actual, `790a81d59f7bd31d12167ffe5405befff4738f024acd6ed39ab40a25b020291d` y 1955718 bytes. Se mantienen [procedencia histórica](frontend/css-static/assets/provenance.json) y [actual](frontend/css-static/assets/provenance-current.json), sin afirmar propiedad o licencia nueva sobre Google CSS.

Ejecutar explícitamente `node tooling/prepare-native-css.mjs` antes de build/tests. El helper verifica ambos inputs y cuatro destinos fijos, con límites de expansión, hashes, rechazo de enlaces y protección frente a sobrescrituras. No hay red, postinstall ni preparación automática. Usar el lockfile y compilar con `PLL_HTML_CACHE_MODE=off`; el build rechaza otros modos. La fecha del manifiesto cambia al reconstruir: comparar los siete hashes de salida. Los JSON históricos y las dos pruebas de portabilidad permanecen exactos.

## Historial y restauración

Se conservan los recibos [f62](frontend/css-static/activation-f62-receipt.json), [cf48](frontend/css-static/activation-cf48-cache-all-receipt.json), [7ff](frontend/css-static/activation-7ff-receipt.json) y [f550](frontend/css-static/activation-f550-receipt.json). f62 fue el respaldo del PR #9 del 5 de noviembre; ese PR no contenía esta recuperación de compatibilidad del día 6. Las versiones antiguas con caché HTML `all` no son restauraciones rutinarias recomendadas después del fallo de tokens envejecidos. f62 también rechaza la forma nativa actual de 519 elementos.

Conservar Worker `pll-renderer-free-20261103`, clase `PllRenderer`, namespace `585ce224e0634c4bb0f61402e313787a`, binding `PLL_RENDERER`, objeto `pll-renderer-v1`, Pages y reglas. Cualquier restauración exige verificar la versión, modo compilado y compatibilidad del origen real. Este paquete no despliega ni automatiza GitHub, sitemaps o formularios.
