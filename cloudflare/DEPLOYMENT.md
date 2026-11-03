# Cloudflare: estado y procedimiento de entrega

Estado al 3 de noviembre de 2026: publicado y aceptado en producción. Las 43 páginas comprobadas respondieron con el contenido adaptado y la versión esperada. Este documento es la referencia operativa actual. Los documentos del frontend anterior se mantienen como historial.

La solución mantiene Google Sites como origen del contenido e imágenes. Pages comprueba la petición y la pasa por una conexión interna a un Durable Object SQLite, donde se ejecuta el mismo adaptador de contenido y SEO validado. La configuración usa el plan gratuito. El backend no tiene una ruta pública de proxy, dominio propio, workers.dev ni URLs públicas de preview. Su entrada HTTP predeterminada devuelve 404.

## Identidad del paquete verificado

| Componente | Identidad |
| --- | --- |
| Código y compilados | `frontend/durable-free/` |
| Proyecto Pages | `pll-seo-preview-20261102` |
| Worker del backend | `pll-renderer-free-20261103` |
| Clase SQLite | `PllRenderer` |
| Conexión de Pages | `PLL_RENDERER` |
| Objeto fijo | `pll-renderer-v1` |
| Versión real del backend probado | `6a508332-86d1-4e6f-9856-1380e95b8fb5` |
| Namespace SQLite conectado | `585ce224e0634c4bb0f61402e313787a` |
| Despliegue preview probado | `415a1f22-8edd-49d9-80e5-7fd48cf09db1` |
| Despliegue de producción aceptado | `4f080bac-378b-4a5e-b055-eab7df8502bf` |
| SHA256 del frontend | `3d7351a56f2729327f85ecf350e0c4729689b882c11c8b294d4aa771d87f08e9` |
| SHA256 del backend | `9bc11f3b59345396838c7fca7d56e8e414d3be892ba9c542d504fef34368852b` |
| SHA256 del renderer de referencia | `58a76f2dd366fb20b03ebb9db9f0dd401df51ef10186959a96d844285c38e509` |

Los dos compilados están en `frontend/durable-free/dist/`. `X-PLL-Backend-Version` identifica la versión real del backend y `X-PLL-RendererSha256` identifica el renderer. Comprobar ambos permite detectar una conexión ausente o una versión anterior después de un despliegue.

El [recibo público de activación](frontend/durable-free/activation-receipt.json) resume la aceptación sin capturas de HTML, cabeceras de visitantes, direcciones IP ni registros de peticiones. La producción usa el mismo ZIP de tres archivos probado en preview, SHA256 `81c5cc369c31991fe4f11c64901908ca2932a8abdf219ca028f18b8afb4cabf1`.

## Verificación disponible

- 15 pruebas de wrappers, límites, entrega de cuerpos y transporte; cobertura de sus módulos: 100% de líneas, 96,47% de ramas y 95,24% de funciones. Cuatro pruebas adicionales de configuración.
- 145 redirecciones comprobadas mediante GET y HEAD, conservando las consultas; búsqueda pública y sus límites por cliente comprobados en el runtime nativo.
- 39 páginas comparadas sin conexión a Internet: contenido exacto y recursos de imágenes, CSS, scripts, mapas y formularios preservados; producción y preview difieren únicamente en los metadatos públicos de versión y el noindex de preview.
- Preview publicado: cuatro páginas de control y las 35 páginas pendientes respondieron correctamente, con backend y renderer identificados. En las primeras cuatro muestras reales, Pages consumió 1–2 ms de CPU y el Durable Object 40–69 ms. Son muestras puntuales, no una garantía de capacidad bajo carga.
- Producción publicada: cuatro portadas, cuatro contactos y las 35 páginas pendientes, 43 de 43 con HTTP 200, indexación permitida, canonical de su dominio público, versión del backend y renderer exactos. Se comprobaron 387 enlaces de cabecera y 129 enlaces de pie, sin destinos de teléfono incorrectos detectados, fallback de entrega ni errores 1102 en estas peticiones. Las cuatro páginas de contacto conservaron sus iframes originales de mapa y formulario.
- Telemetría real de producción: 43 muestras completas correspondientes a esas peticiones, todas con resultado `ok`, máximo 2 ms de CPU en Pages. La cifra corresponde al frontend; no se atribuye al renderer del Durable Object.
- Navegación real en navegador: escritorio español → empresa → francés y móvil francés → empresa equivalente en italiano. Ambos recorridos conservaron el servicio consultado; después se restauró el tamaño de pantalla habitual.

El frontend sigue sujeto al límite gratuito de Pages de 10 ms de CPU por petición. El Durable Object SQLite tiene un presupuesto de CPU distinto y cuotas gratuitas de peticiones y duración. Confirmar las cuotas actuales de toda la cuenta antes de cambiar tráfico. La revisión comprobó que la cuenta continuaba en Free. No se activó ningún plan de pago.

## Preparación reproducible

Desde `cloudflare/frontend/durable-free/`:

```sh
npm ci
npm run build
npm run coverage
node --test config/config.test.mjs
npx --yes wrangler@4.157.0 deploy --config config/backend.wrangler.json --dry-run --outdir .wrangler-dry-run
```

La preparación requiere Node.js compatible con las dependencias fijadas en `package-lock.json`. Las pruebas locales nativas abren únicamente conexiones locales; todos sus destinos externos están interceptados. Las capturas privadas usadas para la comparación de 39 páginas no forman parte de este repositorio.

Las dos configuraciones portables son idénticas a las verificadas excepto por la eliminación de `$schema`, una referencia del editor a herramientas locales ausentes del repositorio. No cambia ninguna opción de ejecución o despliegue.

## Procedimiento para próximas publicaciones

La activación anterior ya está completada y aceptada. Para otra versión, repetir las comprobaciones antes de sustituir los identificadores del recibo; no asumir que una nueva compilación conserva automáticamente esta aceptación.

Preview y producción comparten ahora el mismo backend. Cambiar su código afecta a ambos entornos. Para ensayar otra versión del backend, usar primero un Worker y namespace separados con sus nombres y bindings revisados; conservar el backend aceptado hasta validar esa versión. Las instrucciones y la configuración siguientes describen la instalación exacta ya aceptada, no un aislamiento automático de nuevas versiones.

1. Verificar cuenta, hashes y versión revisada. Autenticarse mediante el acceso oficial de Cloudflare cuando se disponga de la autorización correspondiente. No crear claves dentro del repositorio.
2. Para reinstalar el backend aceptado, desde la carpeta del paquete usar `npx --yes wrangler@4.157.0 deploy --config config/backend.wrangler.json`. Esta operación crea o actualiza el namespace SQLite declarado en `exports`; copiar solamente el JavaScript no lo crea. Las actualizaciones de un Durable Object pueden tardar en activarse: confirmar el ID de versión devuelto, sin asumir que el primer resultado ya usa código nuevo. Para otro backend, revisar primero el destino aislado indicado arriba.
3. En Dashboard, configurar Pages → Settings → Bindings → Durable Object: `PLL_RENDERER` apunta a `PllRenderer` del Worker `pll-renderer-free-20261103`. Preview y producción son ajustes separados, pero ambos apuntan intencionadamente al mismo namespace y al mismo objeto. Comparten cuotas y capacidad.
4. Conservar el despliegue vigente en producción mientras se configura preview. Subir los tres archivos de `dist/frontend/` como un ZIP de Pages. El alias exacto `recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev` activa los mismos controles de contenido que producción y mantiene `noindex, nofollow` y `no-store`.
5. Antes de adoptar producción, comprobar la versión real, las cuatro páginas de control, las 35 pendientes, ambas métricas de CPU y errores, enlaces entre idiomas, teléfonos, formularios y mapas sin enviar consultas reales. Después conectar producción y publicar exactamente el mismo frontend aprobado; verificar de nuevo sus dominios públicos.

`config/pages.wrangler.json` describe los bindings esperados en ambos entornos. El procedimiento actual los gestiona en Dashboard. Usar ese archivo con Wrangler Pages convierte esos campos en fuente de configuración; no mezclar ambos métodos sin revisar la configuración efectiva.

## Reversión

Si falla preview, conservar producción. Si falla después de adoptar producción, restaurar desde el historial de Pages el despliegue de emergencia `d9d24838-84a1-4d71-a7bf-2fde5e6e2878`, que redirige temporalmente al Google Sites publicado y no depende del binding. Es una recuperación temporal con funciones de SEO y navegación distintas al adaptador completo. Los paquetes históricos anteriores a esta recuperación están archivados, pero el adaptador anterior excedió el presupuesto de CPU de Pages y no debe restaurarse como solución definitiva.

No eliminar el namespace ni aplicar migraciones de borrado durante una reversión. El paquete actual no añade fallback automático por fallo de transporte: responde temporalmente con 503, sin filtrar errores internos. El renderer conserva sus reglas de compatibilidad de origen ya existentes.

La prueba de envío y recepción real del formulario sigue aplazada por el usuario. Las imágenes actuales se conservan. La automatización de GitHub y sitemaps sigue fuera de este cambio.

## Documentación oficial

- [Durable Objects: límites](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Durable Objects: precios y cuotas gratuitas](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Declaración y migraciones SQLite](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)
- [Conexión de Pages con Durable Objects](https://developers.cloudflare.com/pages/functions/bindings/#durable-objects)
- [Metadatos de versión](https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/)
