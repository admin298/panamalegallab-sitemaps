# Cloudflare: recuperación con HTML cache desactivado

El [recibo de recuperación](frontend/css-static/activation-receipt.json) identifica la versión activa `f62aeb5b-7e37-4bf1-9633-0985f1f4060e`, 422116 bytes, SHA-256 `620e28f7e53d63f3f818a91cbd09e898a59e31f3d509664cca1e8c081a7bc521`. Su aceptación de imágenes procede de cinco vistas públicas en cuatro idiomas; la optimización de velocidad móvil sigue abierta.

## Retirada de la caché HTML

Una comprobación acotada encontró imágenes válidas con HTML de unos 2 segundos y tokens de imagen rotos con el mismo HTML envejecido unos 159 segundos. Se retiró la reutilización de HTML compilando el modo existente `PLL_HTML_CACHE_MODE=off`. El código fuente no cambia; el backend emitido difiere del cf48 anterior solo en el literal compilado del modo de caché.

Cada visita HTML ejecuta Pages y el DO y solicita una respuesta fresca al origen Google. No lee ni escribe plantillas, inicializa SQLite para la caché, certifica capturas ni encola renovaciones. Se mantienen máximo ocho peticiones en vuelo, sin cola y sin trabajos periódicos. El plan gratuito y los recursos existentes permanecen; las cuotas compartidas son finitas y la latencia del origen no queda garantizada.

Los límites anteriores de 300 segundos, 32 entradas, 8 MiB y 32 posiciones SQLite quedan como historial y capacidad dormida del código, sin reutilización activa. No reactivar `all` durante una restauración rutinaria: el envejecimiento de tokens motivó su retirada.

## Políticas y recursos conservados

Las cuatro variables `PLL_IMAGE_FORMAT`, `PLL_CSS_STATIC`, `PLL_NATIVE_IMPRESSIONS` y `PLL_INITIAL_RENDER` permanecen en `all`. `config/backend.cache-off.wrangler.json` conserva el mismo cuerpo que la configuración inicial `all`; no controla el modo de caché, que se compila en el artefacto.

El render inicial retira el enlace exacto a una fuente inválida, añade `loading="lazy"` solo al iframe reconocido de Apps Script y reserva `aspect-ratio:auto 1168 / 854` en el logotipo reconocido de portada cuando falta. Cubre 252 URL preferidas y cuatro aliases propios de portada. Se conservan fuentes válidas, fotografías, URL del formulario, sandbox, permisos y dimensiones. Las formas desconocidas mantienen el documento original; se reutiliza el parser nativo sin otra pasada ni petición al origen.

La política de registro nativo sigue limitada al token reconocido del campo 357/índice 356, con controles de forma, locale, script y nonce. Cliente nativo, docs-liap, GA4, dataLayer y consentimiento permanecen. Esto no prueba entrega de eventos ni conversiones Analytics.

Pages conserva 3349 bytes y SHA-256 `3d7351a56f2729327f85ecf350e0c4729689b882c11c8b294d4aa771d87f08e9`. Los cinco artefactos frontend y los 26 archivos congelados del renderer permanecen exactos. No hay nuevas dependencias, bindings de recursos, namespaces, migraciones ni servicios de pago. Las dos reglas de recuperación permanecen desactivadas.

## Evidencia y límites

El [recibo del build](frontend/css-static/CACHE-OFF-RECEIPT.json) compara 99 archivos de fuente/configuración/pruebas/recursos con el candidato anterior, todos exactos. Su declaración `deployed:false` corresponde a esa preparación local; la publicación y aceptación pública se documentan por separado en el recibo de recuperación del operador.

El replay histórico del 4 de noviembre cubre 252 páginas: 252 enlaces inválidos retirados, 20 iframes diferidos y tres reservas de proporción nuevas; la española ya existía. Los demás bytes aceptados y CSP permanecieron exactos, con una pasada nativa y cero peticiones externas. No son 252 inspecciones públicas nuevas.

Las 12 vistas/seis parejas de preview y ocho GET anteriores corresponden al cf48 con caché y quedan como evidencia histórica. Los seis formularios cargaron al hacer scroll, sin enviar datos. El LCP móvil español de 8178/7936 ms y CLS italiano de 0,136316/0,001681 no miden esta recuperación `off`; se conserva también la pareja con regresión de 324 ms. No se atribuye una mejora global o de CWV de campo a esas muestras históricas. Entrega de formularios, conversiones/atribución Analytics y GSC quedan pendientes.

La recuperación `off` pasó cinco vistas públicas sin consultas, en cuatro idiomas: 97 transferencias de imágenes HTTP 200, cero imágenes rotas y cero reintentos. La revisión española a los 234,604 segundos recibió URL nuevas con los mismos hashes de fotografías, logotipo y overlay. Todas mostraron BYPASS.

La [ejecución PageSpeed 543kcq01on](https://pagespeed.web.dev/analysis/https-www-panamalegallab-com/543kcq01on) registró 56 móvil (LCP 14,7 s) y 78 escritorio (LCP 2,4 s), sin 403 de imágenes en las auditorías de consola ampliadas. Es una medición externa aislada, sin comparación causal ni prueba de CWV de campo. El rendimiento móvil sigue abierto; no se declara finalizada la optimización.

Se descartó el experimento de imágenes adaptables: cuatro vistas tempranas sugerían ahorros limitados, pero una prueba separada de giro a los 160,013 segundos eligió nueve URL de 1280 px no solicitadas antes y las nueve fallaron con 403. No se adoptó código experimental. Una posible separación de CSS crítico sigue siendo solo un plan, sin implementar. La versión f62 y la entrega actual de fotografías permanecen sin cambios.

No se observaron etiquetas `hreflang` en el head público ni de preview. Los alternates de los sitemaps protegidos se conservan.

## Compilación portable

Ejecutar `node tooling/prepare-native-css.mjs` antes de build/tests. Reconstruye dos CSS exactos desde una representación gzip/base64 tras verificar límites y hashes; no usa red ni postinstall. El CSS conserva SHA-256 `7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61` y 1954605 bytes, caché immutable y [procedencia](frontend/css-static/assets/provenance.json).

Usar el lockfile y compilar explícitamente con `PLL_HTML_CACHE_MODE=off`. En PowerShell:

```powershell
$env:PLL_HTML_CACHE_MODE = 'off'
npm run build
npm test
```

El build portable con modo `off` coincidió en los seis artefactos y pasó 163/163 pruebas, sin instalación ni red. Comparar hashes de salida; la fecha del manifiesto cambia. Las configuraciones portables históricas, el helper CSS y sus guardas permanecen exactos. La cobertura anterior de fuente fue 99,68 % líneas, 94,70 % funciones y 89,01 % ramas; se refiere a fuente idéntica, sin una nueva ejecución de cobertura.

## Historial y restauración

El [recibo cf48 con caché](frontend/css-static/activation-cf48-cache-all-receipt.json) permanece exacto, igual que [7ff](frontend/css-static/activation-7ff-receipt.json) y [f550](frontend/css-static/activation-f550-receipt.json). Las versiones históricas con HTML cache `all` no son la restauración recomendada tras esta incidencia.

Conservar Worker `pll-renderer-free-20261103`, clase `PllRenderer`, namespace `585ce224e0634c4bb0f61402e313787a`, binding `PLL_RENDERER`, objeto `pll-renderer-v1`, Pages, SQLite, CSS, fotografías y reglas. Confirmar versión y modo compilado efectivos. No se automatizan publicaciones, sitemaps, GitHub ni envíos de formulario.
