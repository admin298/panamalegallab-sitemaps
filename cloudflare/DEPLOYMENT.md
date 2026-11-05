# Cloudflare: versiones y código aceptados

El [recibo](frontend/css-static/activation-receipt.json) registra la aceptación pública de la corrección del registro nativo: backend `7ffb8661-8eeb-459f-8264-89288caf15fb`,410590bytes, SHA256 `dace42d4bd9f382132a4e152b802457ba7b530f90d8f0b4db87d1505b5b77ae8`, con `PLL_NATIVE_IMPRESSIONS=all`. La propuesta adicional para las imágenes de banca no se incorpora. Tras ese ensayo se restauró la versión logger aceptada y se mantienen las fotografías actuales.

Pages conserva el frontend SHA256 `3d7351a56f2729327f85ecf350e0c4729689b882c11c8b294d4aa771d87f08e9`; sus cinco archivos desplegables siguen exactos. El renderer conserva26 archivos congelados y referencia `58a76f2dd366fb20b03ebb9db9f0dd401df51ef10186959a96d844285c38e509`.

## Política de registro

`PLL_NATIVE_IMPRESSIONS` admite `off`, `preview` y `all`. Solo cambia el token reconocido del campo357/índice356 en una configuración con forma, locale, script versionado y nonce admitidos. Desconocidos o ambigüedades conservan el documento original. No se falsifica una respuesta de telemetría ni se añade un relay. Cliente nativo, docs-liap, scripts GA4, consentimiento y demás bytes mantienen sus condiciones verificadas.

La variable sí es un nuevo binding de configuración del entorno en la API. `newResourceBindings:0` significa que no se añade ningún binding de recurso. Namespace/export del DO, SQLite, binding de servicio Pages→DO, Worker, Pages, DNS y reglas siguen siendo los existentes. Las variables añadidas se enumeran separadamente en el recibo. No hay nuevos recursos de pago, migraciones, cron, calentadores ni tareas periódicas.

La revisión de caché incluye el modo de política y no reutiliza cuerpos de la revisión anterior. No se añaden purgas ni migraciones de almacenamiento.

## Evidencia y límites

La aceptación contabiliza39 documentos:16 vistas primarias de preview observaron61 solicitudes nativas en controles y0 en candidatas;4 primarias públicas observaron0. Las ventanas sin interacción fueron finitas, de16segundos. No se extrapola a tiempo indefinido, cuota o facturación.

Las funciones de idioma y búsqueda se aceptaron en cuatro idiomas. La primera captura funcional italiana falló por la interacción del colector y se conserva; su aceptación procede de un smoke separado con hover. No se reescribió el FAIL original. Las comprobaciones de búsqueda no demuestran la integridad de todos los resultados RPC. Preservar scripts/configuración/dataLayer y consentimiento no demuestra recepción de eventos GA4.

El paquete portable logger pasa146/146 tests incluyendo dos guardas de portabilidad; cobertura99,94% líneas,89,80% ramas y97,42% funciones. Los seis archivos generados coinciden con el candidato aceptado. El audit npm oficial del operador informó0 vulnerabilidades y83 dependencias, sin instalación ni actualización. Logger y hero tienen el mismo lockfile. No se incluye la caché npm.

Las252 rutas preferidas tienen evidencia contractual offline separada; estas muestras no equivalen a252 mediciones públicas. No se afirma una puntuación PageSpeed, mejora global de LCP, capacidad ilimitada o entrega de Analytics.

## HTML y recursos gratuitos

El DO puede reutilizar una respuesta pública válida hasta300segundos absolutos; las visitas no prolongan su vida. Google Sites sigue siendo el origen. Un HIT evita consultar el origen y ejecutar el render completo, pero cada visita HTML mantiene una ejecución Pages y una llamada al DO.

Se conservan32entradas,8MiB de datos contabilizados,32posiciones SQLite, una captura concurrente y límites previos de captura/entrega. No se afirma un límite medido del heap completo. Un error del respaldo pierde ese beneficio y sigue el flujo normal. Las cuotas de cuenta, solicitudes, duración y SQLite siguen siendo finitas y compartidas.

HEAD, POST, búsquedas/RPC, consultas y formas no admitidas siguen su flujo original. El certificado privado v2 comprueba identidad, SHA, CSP y nonces. Cada HIT renueva nonces sin volver a analizar todo el HTML. No salen cabeceras internas. HTML conserva `no-store`.

## CSS, fotografías y portabilidad

CSS permanece exacto: SHA256 `7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61`,1954605bytes. El asset tiene caché immutable y exclusión exacta del Worker; se conserva [su procedencia](frontend/css-static/assets/provenance.json). La corrección de registro no cambia fotografías ni perfiles.

Se guarda el CSS como295904bytes base64 canónico de un gzip determinista de221926bytes. Ejecutar explícitamente `node tooling/prepare-native-css.mjs` antes de build/tests. No hay postinstall ni red. Los dos destinos se publican separadamente tras validación; un fallo parcial se informa y conserva archivos aprobados.

Los ocho JSON portables existentes y `config/css-config.test.mjs` permanecen exactos. Las tres configuraciones logger nuevas omiten solo `$schema` superficial del editor. Se conservan las pruebas que rechazan cambios de ejecución o metadatos anidados. [packaging-provenance.json](frontend/css-static/packaging-provenance.json) relaciona hashes desplegados y portables.

Usar lockfile y `PLL_HTML_CACHE_MODE=all` al compilar. La fecha de build-manifest cambia al reconstruir; comparar modos y hashes de salidas. Compilar no activa por sí solo una variable remota. Los modos CSS, imágenes y registro son independientes.

## Publicación y reversión

Se conserva Worker `pll-renderer-free-20261103`, clase `PllRenderer`, namespace `585ce224e0634c4bb0f61402e313787a`, binding de servicio `PLL_RENDERER` y objeto fijo `pll-renderer-v1`. Preview y público comparten backend y cuotas. Cambiar variables aparece en la API sin crear otro namespace o binding de recurso.

Para revertir esta corrección, restaurar la versión aceptada `f550851a-2013-4772-8263-f39abd3d03f6`, SHA256 `b418914671ad90e2e53ee4bd190bbfde2ed0636600bff7142f113933ccd793ff`, en el mismo Worker/SQLite. Su [recibo anterior](frontend/css-static/activation-f550-receipt.json) permanece exacto. Conservar Pages, CSS, fotografías, namespace, tabla y reglas. Confirmar ID/modos efectivos; una nueva compilación no equivale al artefacto histórico.

La opción de imágenes de banca no superó las guardas fijadas y se descartó; su código y configuraciones no forman parte de esta entrega. No se automatizan sitemaps, GitHub, publicaciones ni envíos de formulario.

La restauración posterior al ensayo se comprobó con cuatro GET públicos, uno por idioma: HTTP 200, versión logger aceptada, canonical y flag nativo correctos, sin política hero y con fondo y loader originales. Fueron cuatro intentos, sin reintentos; sus cuerpos y capturas no forman parte del paquete.
