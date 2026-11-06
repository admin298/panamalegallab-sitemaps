export const HERO_NONCE='HeroNonce123';
export const HERO_URL='https://lh7-us.googleusercontent.com/sitesv-images-rt/'+ 'A'.repeat(80)+'=w16383';
export const HERO_ESCAPED=HERO_URL.replaceAll('/','\\/').replace('=w16383','\\x3dw16383');
export const HERO_TEMPLATE=`const imageUrl = '__HERO_IMAGE_URL__';
function bgImgLoaded() { if (!globals.headerBgImgLoaded) { globals.headerBgImgLoaded = new Date().getTime(); }
else { globals.headerBgImgLoaded(); } }
if (imageUrl) { const img = new Image(); img.src = imageUrl; img.onload = bgImgLoaded; globals.headerBgImgExists = true; }
else { globals.headerBgImgExists = false; }`;
export const heroScript=(literal=HERO_ESCAPED)=>HERO_TEMPLATE.replace("'__HERO_IMAGE_URL__'",literal===null?'null':"'"+literal+"'");
export const heroTag=(position='center center',role='img')=>`<div class="IFuOkc" style="background-position: ${position}; background-image: url(${HERO_URL}); background-size: cover;" jsname="LQX2Vd"${role===null?'':` role="${role}"`} aria-label="Same photo"></div>`;
export function heroDocument({language='es',position='center center',role='img',noPhoto=false}={}) {
  const site=language==='es'?'panamalegallab':`panamlegallab-${language}`;
  return `<!doctype html><html><head><meta charset="utf-8"><script nonce="${HERO_NONCE}">${heroScript(noPhoto?null:HERO_ESCAPED)}</script></head><body><div data-domain="panamalegallab.com" data-sitename="${site}"></div>${noPhoto?'':heroTag(position,role)}<div class="IFuOkc" style="background-color:blue"></div><img src="https://example.invalid/unrelated.jpg" alt="Untouched"><p>Panamá 😀</p></body></html>`;
}
