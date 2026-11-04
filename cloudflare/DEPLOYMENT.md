# Cloudflare: entrega actual

Aceptada en producción: 2026-11-04T16:33:18Z. El [recibo](frontend/css-static/activation-receipt.json) identifica la validación.

Paquete: `frontend/css-static/`. Pages real: `bc2cd6ed-c1ed-448e-9873-df07ee3e7a53`. Backend real: `44ca5e88-b938-4087-8269-cb9efb27016d`; SHA256 `faf97097fac5c117459a4843c8a2235ccc143e767289b34216351081c5ed13dc`. El código frontend Pages permanece en `3d7351a56f2729327f85ecf350e0c4729689b882c11c8b294d4aa771d87f08e9` y el renderer de referencia en `58a76f2dd366fb20b03ebb9db9f0dd401df51ef10186959a96d844285c38e509`. Los assets estáticos de Pages sí se actualizan.

## CSS estático exacto

La hoja pública original de Google se entrega desde `/_pll-assets/sites-7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61.css` con SHA256 `7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61` y 1954605 bytes decodificados, sin minificar ni transformar. Se conserva [su procedencia y atribución](frontend/css-static/assets/provenance.json). El reemplazo solo se aplica a esa versión y URI de origen exactas; el resto del CSS y fuentes conserva su origen. Un error inicial al cargar la copia local restaura la hoja original de Google. Un cambio de versión en Google conserva el origen hasta revisar y publicar una nueva copia.

En la muestra finita de ocho cargas, la duración de CSS mejora en 4/4 parejas y FCP en 3/3 parejas con dato disponible; falta el FCP de un control de escritorio. LCP de escritorio es mixto: una pareja empeora +457 ms. El control móvil de 19,19 segundos de CSS externo se conserva como observación atípica. No se afirma mejora general de LCP, puntuación PageSpeed ni reducción de bytes del CSS: la comparación comprimida registrada fue 225846 B de Google y 242742 B de Cloudflare.

## Imágenes existentes

Las ocho imágenes indicadas solicitan la representación nativa WebP de Google CDN. Los procesos de portada conservan los píxeles; las fotografías de banca tienen conversión con pérdida permitida y aprobada visualmente. Se conservan las fotografías, encuadres y dimensiones. Este ahorro de imágenes no demuestra por sí solo una mejora de velocidad de toda la página.

| Perfil / idioma | Bytes originales | Bytes WebP | Dimensiones | Calidad |
| --- | ---: | ---: | --- | --- |
| home-process / es | 809989 | 679044 | 696×1024 | Exactos |
| home-process / en | 768218 | 650554 | 653×1024 | Exactos |
| home-process / fr | 715640 | 610636 | 599×1024 | Exactos |
| home-process / it | 783212 | 659520 | 669×1024 | Exactos |
| bank-corporate / es | 73518 | 51862 | 427×683 | Con pérdida aprobada |
| bank-corporate / en | 84198 | 59946 | 491×683 | Con pérdida aprobada |
| bank-corporate / fr | 73251 | 51794 | 424×683 | Con pérdida aprobada |
| bank-corporate / it | 75192 | 53914 | 446×683 | Con pérdida aprobada |

## Almacenamiento comprimido del código

Esta copia de GitHub reemplaza únicamente las dos CSS crudas por un texto ASCII canónico de 295904 bytes que contiene exactamente el gzip determinista de 221926 bytes; producción no cambia. Antes de cualquier prueba o build, ejecutar explícitamente `node tooling/prepare-native-css.mjs` desde `frontend/css-static/`, y después `node --test tooling/prepare-native-css.test.mjs`. No hay postinstall, red ni preparación automática dentro de build.mjs. El helper limita el texto ASCII a 295904 bytes, valida alfabeto y padding base64, exige recodificación idéntica, comprueba los 221926 bytes y SHA del gzip, y limita la salida a 1954605 bytes antes de validar el SHA original. Solo publica las dos rutas fijas, sin reemplazar contenido existente. Cada archivo se publica atómicamente; los dos archivos no forman una transacción. Un fallo parcial se informa y se completa repitiendo el comando; un staging cuya identidad no puede verificarse se conserva explícitamente. Los 78 archivos de la fuente original se reconstruyen exactos, salvo las ocho omisiones editoriales `$schema` ya documentadas. Los cinco archivos desplegables de Pages coinciden byte por byte. Build, runtime, configuraciones, fotos y estilos no se modifican. La sección `repositoryPackaging` del recibo conserva el manifiesto original, procedencia y verificación; provenance.json y verification.json originales son el historial sellado.

## Publicación y cuotas

Se conserva el Worker `pll-renderer-free-20261103`, clase `PllRenderer`, namespace `585ce224e0634c4bb0f61402e313787a`, binding `PLL_RENDERER` y objeto fijo `pll-renderer-v1`. No crear otro Worker ni namespace. Preview y producción comparten backend y cuotas. Se mantiene Free, HTML no-store y Google Sites como origen vivo; la cuota gratuita sigue siendo finita. El asset CSS estático se excluye exactamente de la invocación Worker y admite caché immutable; eso no convierte el HTML en contenido cacheado.

Desde la carpeta del paquete: `npm ci`, `npm run build`, las pruebas de su README y revisión de hashes. Publicar primero los cinco assets exactos de Pages, verificar MIME, hash y exclusión estática; después activar el backend. La publicación autorizada usa `config/backend.all.wrangler.json` con `PLL_IMAGE_FORMAT=all` y `PLL_CSS_STATIC=all`. El default `config/backend.wrangler.json` mantiene ambas variables off. Los perfiles difieren solo en estas dos variables; `backend.all-css.wrangler.json` pone imágenes off y no representa la activación combinada. Confirmar versiones reales, fallback y los cuatro idiomas después.

## Reversión

Primero desactivar únicamente `PLL_CSS_STATIC=off` en una copia del perfil all, manteniendo `PLL_IMAGE_FORMAT=all` y el mismo Worker/SQLite. Tras confirmar que el HTML vuelve a usar Google, conservar el asset CSS inerte para visitantes con documentos anteriores. No borrar primero el asset. La recuperación amplia conserva `frontend/durable-free/dist/backend/worker.js` (SHA256 `9bc11f3b59345396838c7fca7d56e8e414d3be892ba9c542d504fef34368852b`) y su configuración. Restaurarlos en el MISMO Worker/SQLite, confirmar el nuevo ID real y renderer esperado, sin borrar namespaces ni ejecutar migraciones de borrado. El Pages frontend conserva el binding actual; el Pages de emergencia histórico sigue siendo la recuperación temporal documentada.

Las fuentes y recibos anteriores permanecen intactos. No se añaden automatizaciones, envíos de formulario, recursos de pago ni un proxy de imágenes.
