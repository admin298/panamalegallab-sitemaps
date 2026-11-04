# Cloudflare: entrega actual

La versión aceptada en producción se identifica en el [recibo de activación](frontend/css-static/activation-receipt.json). Se mantiene el directorio `frontend/css-static/` para conservar la ruta del paquete existente.

Backend: `f550851a-2013-4772-8263-f39abd3d03f6`, SHA256 `b418914671ad90e2e53ee4bd190bbfde2ed0636600bff7142f113933ccd793ff`, con reutilización HTML compilada en modo `all`. Pages permanece en `bc2cd6ed-c1ed-448e-9873-df07ee3e7a53`; sus cinco archivos desplegables son idénticos a la versión anterior. El frontend delgado conserva SHA256 `3d7351a56f2729327f85ecf350e0c4729689b882c11c8b294d4aa771d87f08e9` y el renderer de referencia `58a76f2dd366fb20b03ebb9db9f0dd401df51ef10186959a96d844285c38e509`.

## HTML público en cuatro idiomas

Las 252 rutas preferidas, incluidas las 136 comerciales, pueden reutilizar una respuesta pública válida dentro del Durable Object existente. La clave separa host real, ruta, idioma y revisión; preview conserva `noindex` y no calienta las claves públicas. Google Sites sigue siendo el origen: una publicación puede tardar hasta 300 segundos en reflejarse. La duración es absoluta; las visitas no la prolongan y no se sirve contenido caducado.

Un HIT evita consultar Google y ejecutar el render completo. Cada visita HTML conserva una ejecución Pages y una llamada al DO; no se afirma que elimine su consumo. HEAD, POST, búsquedas/RPC, consultas URL, rutas desconocidas y respuestas incompatibles siguen el flujo original. El frontend ya elimina credenciales, Cookie y cabeceras condicionales: no se promete que las cabeceras originales del navegador fuerzan el bypass.

La capa de memoria admite hasta 32 entradas y 8 MiB de datos contabilizados, sin afirmar un límite medido de todo el heap. El respaldo usa una tabla dedicada en el SQLite existente con 32 posiciones fijas; cada posición limita cuerpo a 1 MiB y cabeceras a 64 KiB. Hay como máximo un SELECT al fallar memoria y un UPSERT al admitir una respuesta nueva. Los HIT no escriben en SQLite; una colisión produce un fallo seguro de caché. La caducidad limita la entrega, no borra físicamente filas: los datos públicos vencidos pueden permanecer hasta su reemplazo.

Solo hay una captura/certificación concurrente; los demás fallos siguen renderizando sin cola ni trabajo adicional de captura. Se conservan ocho solicitudes simultáneas y el límite de entrega de 30 segundos. Captura: 1 MiB, 2048 fragmentos, ocho fragmentos vacíos y 1000 ms como máximos. El respaldo opcional tiene plazos finitos y se desactiva ante error, sin reintentos. No hay cron, alarmas, calentadores, polling, nuevos bindings ni namespaces.

El certificado privado v2 verifica identidad, CSP, SHA256, caducidad y posiciones de nonce en bytes. Cada HIT genera nonces de script y estilo independientes y nuevos, sin volver a analizar el HTML completo. SHA256 es integridad, no firma: se confía en el escritor privado. Las cabeceras internas no salen al público, no se repiten validadores ni telemetría por petición, y la versión backend se aplica a la respuesta final. El HTML conserva `no-store`; las imágenes y otros flujos mantienen su política original.

## Evidencia y límites

El recibo registra 126 pruebas locales aprobadas con cobertura de líneas 99,94 %, ramas 88,54 % y funciones 97,75 %. El piloto midió cinco parejas MISS/HIT: TTFB de 529,54–776,81 ms en MISS y 129,10–170,98 ms en HIT, en esa muestra finita. La muestra pública final comprobó 16 respuestas de ocho páginas en cuatro idiomas. Se observó un HIT SQLite a 287 segundos y renovación desde origen tras 366,186 segundos; no se extendió la vida al acceder.

Los contadores causales nativos locales comprobaron 49 llamadas frontend→DO y 26 llamadas al origen local, sin HTTP externo, manteniendo estable el origen en HIT. No se obtuvo traza remota del backend: su CPU exacta y conteo remoto permanecen desconocidos. La muestra real del frontend llegó como máximo a 2 ms de CPU. Esto no demuestra capacidad global, mejora general de LCP ni una puntuación PageSpeed. Las cuotas gratuitas de cuenta, solicitudes, duración y SQLite siguen siendo finitas y compartidas.

## CSS y fotografías

La hoja original de Google se conserva sin transformar: `/_pll-assets/sites-7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61.css`, SHA256 `7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61`, 1954605 bytes. Se mantiene [su procedencia](frontend/css-static/assets/provenance.json), atribución, URI exacta y fallback inicial a Google. Cambios de versión de origen permanecen en Google hasta revisión. El asset estático conserva caché immutable y queda excluido exactamente del Worker.

Los ocho perfiles WebP previamente aceptados conservan fotos, encuadres y dimensiones: procesos de portada con píxeles exactos y banca con conversión con pérdida aprobada visualmente. Esta entrega no cambia sus archivos ni perfiles. El recibo anterior conserva las medidas de imágenes y CSS; no se atribuye a esta modificación un nuevo ahorro de esos assets.

## Copia portátil y compilación

El CSS se almacena como base64 ASCII canónico de 295904 bytes que representa un gzip determinista de 221926 bytes. Antes de probar o compilar, ejecutar explícitamente desde el paquete `node tooling/prepare-native-css.mjs` y `node --test tooling/prepare-native-css.test.mjs`. El helper limita tamaños, valida alfabeto/padding/recodificación, hashes comprimido y decodificado y reconstruye solo dos rutas fijas sin reemplazar archivos. Publica atómicamente cada archivo, no una transacción de los dos; un fallo parcial se informa y puede completarse repitiendo el comando. No usa red, postinstall ni preparación automática en build.

Se conservan byte a byte el base64, el helper y sus 19 pruebas, los ocho JSON portables y las 14 pruebas de configuración del paquete anterior. Los JSON omiten únicamente el `$schema` del editor. La comparación de pruebas normaliza solo ese metadato superficial; los campos de despliegue y metadatos anidados siguen verificados. El recibo relaciona las excepciones portables y los hashes del código original aceptado.

Usar `npm ci`. Para reproducir el artefacto aceptado, definir `PLL_HTML_CACHE_MODE=all` y ejecutar `npm run build`, `npm test` y `npm run coverage`. En PowerShell: `$env:PLL_HTML_CACHE_MODE='all'; npm run build`; en POSIX: `PLL_HTML_CACHE_MODE=all npm run build`. El default es `off`; `preview` y `all` son modos compilados. La fecha de `build-manifest.json` cambia al reconstruir: comparar modos y hashes de sus salidas. Los modos de imágenes/CSS son independientes; `config/backend.all.wrangler.json` conserva ambos en `all`, mientras el default los mantiene `off`.

## Publicación y reversión

Se conserva Worker `pll-renderer-free-20261103`, clase `PllRenderer`, namespace `585ce224e0634c4bb0f61402e313787a`, binding `PLL_RENDERER` y objeto fijo `pll-renderer-v1`. No crear otro recurso ni ejecutar migraciones de borrado. Preview y producción comparten backend y cuotas. Una publicación futura requiere pruebas/revisión y un piloto finito, validación de escritorio/móvil y cuatro idiomas, y comprobación pública posterior. El archivo de código no publica por sí mismo.

Para revertir solo la reutilización HTML, restaurar en el MISMO Worker/SQLite el artefacto anterior aceptado `44ca5e88-b938-4087-8269-cb9efb27016d`, SHA256 `faf97097fac5c117459a4843c8a2235ccc143e767289b34216351081c5ed13dc`, conservado en el historial Git previo a este cambio. También puede reconstruirse este código con `PLL_HTML_CACHE_MODE=off` y verificar su nuevo artefacto antes de publicarlo; ese build no es el b418 aceptado. Mantener Pages, CSS, imágenes, namespace y tabla; el backend anterior ignora la tabla opcional. Confirmar el nuevo ID real después.

La recuperación amplia histórica [durable-free](frontend/durable-free/README.txt) permanece intacta; no debe confundirse con la reversión puntual de HTML. No se automatizan sitemaps, publicaciones, cambios de GitHub ni envíos de formulario.
