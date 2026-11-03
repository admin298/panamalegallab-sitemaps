Configuración portable de Cloudflare Free

La referencia actual de estado y despliegue es ../../../DEPLOYMENT.md desde config/.
El paquete ya fue probado en preview y aceptado en producción.

Wrangler oficial fijado: 4.157.0. Desde la carpeta durable-free:
  npx --yes wrangler@4.157.0 deploy --config config/backend.wrangler.json --dry-run --outdir .wrangler-dry-run
  node --test config/config.test.mjs

Una publicación autorizada usa el mismo comando deploy sin --dry-run. No ejecutar
versions upload para crear el recurso. exports registra PllRenderer como SQLite;
no se combina con migrations legacy. El bundle se entrega con no_bundle:true.
CF_VERSION_METADATA recibe la versión real del backend. Las opciones de ejecución
son idénticas al paquete probado; sólo se eliminó $schema, del editor local.

Backend: pll-renderer-free-20261103, defaultHTTP404, sin workers.dev ni preview URLs.
Pages: pll-seo-preview-20261102, binding PLL_RENDERER a ese namespace y esa clase.
El frontend usa el objeto fijo pll-renderer-v1. Los entornos preview y producción
son configuraciones separadas que apuntan al mismo namespace y comparten cuotas.

El procedimiento actual usa Dashboard para las conexiones de Pages. El archivo
pages.wrangler.json es la referencia de campos esperados. Usarlo con Wrangler
Pages cambia la fuente de configuración de esos campos; no mezclar ambos métodos
sin revisar el estado efectivo. Cada cambio de binding exige otro despliegue.

No hay secretos, custom domains, rutas externas, cron, activación de plan de pago
ni almacenamiento de logs. No se deben guardar credenciales en el repositorio.
Para revertir se restaura el Pages de emergencia documentado y se conserva el
namespace; no se ejecutan migraciones de borrado ni se eliminan recursos.
