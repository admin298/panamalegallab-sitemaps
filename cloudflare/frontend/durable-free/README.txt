Panama Legal Lab: paquete de recuperación en el plan gratuito
Release pll-durable-free-20261103-v1

Estado: publicado y aceptado en producción el 3 de noviembre de 2026.
La referencia operativa actual es ../../DEPLOYMENT.md desde esta carpeta.
activation-receipt.json identifica el despliegue, sus compilados y la aceptación.

Pages delega la adaptación de Google Sites a un Durable Object SQLite interno.
Los compilados probados están en dist/frontend/_worker.js y dist/backend/worker.js.
El renderer58 y sus fuentes se conservan exactamente. Las imágenes, CSS, scripts,
formularios y mapas conservan el contrato validado. No se envían formularios reales.

Preparación desde esta carpeta:
  npm ci
  npm run build
  npm run coverage
  node --test config/config.test.mjs
  npx --yes wrangler@4.157.0 deploy --config config/backend.wrangler.json --dry-run --outdir .wrangler-dry-run

Backend privado: pll-renderer-free-20261103. Clase SQLite: PllRenderer.
Binding de Pages: PLL_RENDERER. Nombre de objeto fijo: pll-renderer-v1.
El backend público predeterminado devuelve 404; workers.dev y preview URLs están
desactivados. No hay lecturas/escrituras de almacenamiento, alarmas, WebSockets,
intervalos, caché persistente, secretos ni dependencias de un plan de pago.

Cada instancia conserva un solo handler y las cuotas de búsqueda y páginas por
cliente. Hay como máximo ocho respuestas activas, con liberación al terminar o
cancelar el cuerpo. Un límite de 30 segundos cancela cuerpos abandonados. El
temporizador de entrega sólo vive mientras una respuesta está activa. La petición a
Google conserva su propio plazo de 20 segundos. Son límites de tiempo de pared,
distintos de los presupuestos de CPU y de las cuotas gratuitas de la cuenta.

Sólo Origin, Referer, Sec-Fetch-Site, Content-Type, Content-Length,
Content-Encoding y CF-Connecting-IP del edge pasan a la conexión interna.
Cookies, Authorization y el resto de cabeceras del visitante se descartan.
Un fallo de conexión produce 503 genérico y no reintenta una referencia fallida.

X-PLL-Backend-Version comunica la versión real desplegada; X-PLL-RendererSha256
identifica el renderer58. El alias de preview de producción conserva noindex y
no-store. Comprobar las dos versiones y métricas de CPU al publicar otra versión.

Pruebas: 15 de transporte/wrappers y runtime nativo, cuatro de configuración,
145 redirecciones GET/HEAD y comparación local de 39 páginas/117 respuestas.
Cobertura de wrappers: 100% líneas, 96,47% ramas, 95,24% funciones.
Producción: 43 páginas aceptadas, 43 muestras reales de CPU Pages con máximo2ms,
todas con resultado correcto y sin fallback ni errores1102 en esa comprobación.
El único fixture público nuevo es un resultado de búsqueda vacío ya existente;
los datos de prueba usan direcciones IP reservadas de documentación. El corpus
privado de 39 páginas y sus registros de validación no se incluyen.

Las configuraciones portables omiten únicamente la propiedad $schema del editor
que apuntaba a herramientas locales. El resto de sus opciones es idéntico.
Los documentos anteriores de cloudflare/frontend/ quedan como historial.
