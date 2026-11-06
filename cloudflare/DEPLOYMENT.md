# Cloudflare: cabecera móvil de 1280 px

El [recibo de activación](frontend/css-static/activation-receipt.json) identifica el backend `87feb3fd-50c1-4865-884e-49074049f706`, 434028 bytes, SHA-256 `3b4f29b06d61790b56a722c1d15a926da6f8437c2b5d283d85f4a1d5208aff7d`, con tráfico al 100 %, y Pages `f8843680-6120-47cb-93fe-1324addffd64`. Su frontend mide 3750 bytes, SHA-256 `72d46465485f1b00ecab178a57ab9db03403ba37371011840183afa241a2f953`. La aceptación pública terminó el 6 de noviembre a las 15:38:49 UTC.

`PLL_HERO_WIDTH=all` limita a 1280 px la fotografía nativa de cabecera en móvil. Solo cambia el ancho en dos referencias coincidentes: CSS y literal de URL del preloader nativo. Mantiene fotografía, composición, recorte y lógica nativa; la resolución de escritorio queda igual. Las formas desconocidas se conservan y las cabeceras sin fotografía son noops válidos. No se añaden JavaScript al cliente, peticiones, proxy de imágenes, dependencias, bindings de recursos ni trabajos periódicos. La variable nueva sí es configuración del entorno.

Las cinco políticas están en `all`: `PLL_IMAGE_FORMAT`, `PLL_CSS_STATIC`, `PLL_NATIVE_IMPRESSIONS`, `PLL_INITIAL_RENDER` y `PLL_HERO_WIDTH`. La caché HTML sigue compilada en `off`; cada visita HTML ejecuta Pages, llama al DO y solicita de nuevo el origen Google. Máximo ocho peticiones en vuelo, sin cola. Permanecen el plan Free, sus cuotas finitas, SQLite y las reglas existentes; no se garantiza la latencia del origen. Los límites históricos de 300 segundos/32 entradas son capacidad dormida, sin reutilización activa.

La auditoría pública finita cubrió 252 URL preferidas de cuatro idiomas: 248 con las referencias de cabecera ajustadas y cuatro legales sin fotografía. Hubo cuatro sondas adicionales de dispositivo, cero errores y cero reintentos. Son 256 comprobaciones HTTP de documentos; no son 252 navegadores, decodificaciones de imágenes, puntuaciones de velocidad ni verificaciones de indexación.

Dieciséis vistas públicas de ocho URL —portadas y páginas comerciales en cuatro idiomas, móvil/escritorio— pasaron el contrato de teléfono revisado, sin errores ni reintentos. Conservan el número correcto en portada y la ausencia de texto telefónico en las páginas comerciales. No se rellenaron ni enviaron formularios ni se enviaron consultas/RPC de búsqueda; el navegador y los contextos se cerraron. Esta aceptación no acredita entrega de formularios ni conversiones/atribución Analytics.

El [canary original](frontend/css-static/receipts/hero-width-canary-original-fail.json) permanece en FAIL: ocho de sus 16 vistas pasaron y ocho fallaron por exigir teléfono visible en páginas comerciales que carecían de él también en los baselines históricos. Una enmienda prospectiva, con todos los demás controles conservados, pasó 16 vistas separadas sin modificar el código candidato. El [recibo de aceptación del canary](frontend/css-static/receipts/hero-width-canary-acceptance.json) conserva esa distinción; la aceptación pública posterior es independiente.

Seis parejas contrabalanceadas de laboratorio sobre la portada española móvil dieron seis ganancias de LCP, mediana de 460 ms. El FCP empeoró una mediana de 8 ms y un máximo de 48 ms. El cuerpo de la fotografía se redujo aproximadamente un 19,16 %; no alcanzó el objetivo del 20 %. El caso tardío cubrió un documento ya caliente y tres cambios de viewport tras 190 segundos: no acredita una nueva petición de imagen después de ese plazo ni otras páginas o idiomas.

La [medición pública j9yhkxkllr](https://pagespeed.web.dev/analysis/https-www-panamalegallab-com/j9yhkxkllr) registró 57 móvil/LCP 14,6 s y 82 escritorio/LCP 2,7 s; SEO 100, accesibilidad 100, prácticas 96 y navegación agéntica 2/2 en ambos. El informe anterior `oxuarv97gj`, previo a esta versión, registró 61/82 y LCP móvil 9,2 s. La observación posterior es peor en móvil; no fue una comparación controlada y no permite atribuir el cambio a esta política. No hay datos de campo en el reporte ni prueba de mejora global de PageSpeed o CWV. La optimización móvil continúa abierta. No sumar los subtramos de la traza cruda para compararlos directamente con el LCP simulado: tienen bases temporales distintas.

La copia portable pasó 196/196 pruebas —194 del candidato y dos guardas históricas— en una ejecución. Cobertura de `src`: 99,70 % líneas, 89,00 % ramas y 95,14 % funciones. Los siete artefactos coinciden con el candidato congelado. El helper y sus dos inputs comprimidos permanecen exactos: se reutiliza su evidencia de 28/28 casos, sin repetirla ni afirmar 80 % de cobertura del helper; las copias temporales no se atribuyen al módulo del informe aislado de Node. Las 15 configuraciones JSON anteriores y las guardas de portabilidad permanecen exactas; se añaden dos configuraciones hero-width sin esquema editorial.

Cada uno de los dos CSS se conserva una vez como gzip/base64 canónico, con [procedencia histórica](frontend/css-static/assets/provenance.json) y [actual](frontend/css-static/assets/provenance-current.json). Ejecutar explícitamente `node tooling/prepare-native-css.mjs` antes de build/tests: verifica ambos inputs, cuatro destinos fijos, hashes y límites de expansión, y protege frente a enlaces y sobrescrituras. No hay red, postinstall ni preparación automática. Usar el lockfile y:

```powershell
$env:PLL_HTML_CACHE_MODE = 'off'
npm run build
npm test
node --test tooling/*.test.mjs
```

El build rechaza otros modos de caché. La fecha del manifiesto cambia: comparar los siete hashes de salida. No se empaquetan CSS crudo, fotografías, capturas, dependencias ni cachés. Estos comandos no despliegan ni envían formularios.

La recuperación de compatibilidad [0507](frontend/css-static/activation-0507-receipt.json) sigue como historial y reversión: backend `0507d52a-a3c9-4d18-b8be-f0a6f6703b80`, Pages `06533eae-ba22-4602-8920-631f871dfff1`, ambos con HTML cache `off`. Conserva la forma nativa revisada de 519 elementos y el contrato histórico de 518. El renderer `ab2390e634808742a87beddd19bce908eef3d7ac5ea5375dc709d99a7e546a07`, sus 27 fuentes, `renderer/reference-worker-58.js` y el vendor histórico permanecen exactos en esta entrega; 58 es una identidad histórica. Los recibos f62/cf48/7ff/f550 también se conservan; sus versiones con caché `all` no son restauraciones rutinarias recomendadas tras los fallos de tokens envejecidos.

Conservar Worker `pll-renderer-free-20261103`, clase `PllRenderer`, namespace `585ce224e0634c4bb0f61402e313787a`, binding `PLL_RENDERER`, objeto `pll-renderer-v1`, Pages y reglas. Toda restauración requiere comprobar versión, modo compilado y compatibilidad del origen actual. Entrega de formularios, conversiones/atribución y GSC siguen pendientes. Este paquete no publica ni automatiza GitHub, sitemaps o formularios.
