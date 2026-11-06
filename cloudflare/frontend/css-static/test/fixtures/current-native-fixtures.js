// Minimal public-shape fixtures derived from the four 2026-11-06 native captures.
// No source bodies, signed image URLs, cookies or public bootstrap tokens.
export const CURRENT_VIEW_URLS = Object.freeze({
  es: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.es.evEG0HtR8Ps.O/am=AAAAYAAI/d=1/rs=AGEqA5nxAfWapthEHOE4K2A-y6LqYKA8AA/m=view',
  en: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.en_US.7K42jXwKoL8.O/am=AAAAYAAI/d=1/rs=AGEqA5l1O939Wm7Yi7tplrOF29wrpok45A/m=view',
  fr: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.fr.5qz8a--RjDU.O/am=AAAAYAAI/d=1/rs=AGEqA5llG6Cne3QLlFoEVcnf1RCjwmSVdg/m=view',
  it: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.it.2UqSqMAe3kM.O/am=AAAAYAAI/d=1/rs=AGEqA5nhH4ZaXhd3lLBzlKY1Ku-eZ2svUA/m=view',
});
export const CURRENT_CSS_URL = 'https://www.gstatic.com/_/atari/_/ss/k=atari.vw.FdCCmLj_-18.L.X.O/am=AAAAYAAI/d=1/rs=AGEqA5n0xDEdNb8kZN9KvVeGKVosSfnN8Q';
export const CURRENT_CSS_SHA = '790a81d59f7bd31d12167ffe5405befff4738f024acd6ed39ab40a25b020291d';
export const CURRENT_CSS_PATH = '/_pll-assets/sites-' + CURRENT_CSS_SHA + '.css';
export const CURRENT_NONCE = 'CurrentNonce123';
export const currentConfig = value => Array.from({ length: 519 }, (_, index) =>
  index === 212 || index === 518 ? 0 : index === 356 ? value : null);
export function currentScript(value = null) {
  const base = currentConfig(value);
  const config = base.with(1, 'Panamá, français, società 😀; [quoted], \\"')
    .with(100, ['nested', { preserved: 'brackets [,] and commas,' }]);
  return '_at_config = ' + JSON.stringify(config) + ';window.afterConfig="preserved";';
}
export const currentOrigin = lang => 'https://' + (lang === 'es' ? 'www' : lang) + '.panamalegallab.com';
export function currentDocument(lang = 'es', { script = currentScript(), viewUrl = CURRENT_VIEW_URLS[lang], cssUrl = CURRENT_CSS_URL } = {}) {
  const site = lang === 'es' ? 'panamalegallab' : 'panamlegallab-' + lang;
  return '\ufeff<!doctype html><html><head><meta charset="utf-8">'
    + `<link rel="stylesheet" href="${cssUrl}" data-id="_cl" nonce="StyleNonce456">`
    + `<script nonce="${CURRENT_NONCE}">${script}</script>`
    + `<script src="${viewUrl}" nonce="${CURRENT_NONCE}"></script>`
    + `<script async src="https://www.googletagmanager.com/gtag/js?id=G-FNRPN562BY" nonce="${CURRENT_NONCE}"></script>`
    + `<script nonce="${CURRENT_NONCE}">window.dataLayer=window.dataLayer||[];</script>`
    + `</head><body><div data-domain="panamalegallab.com" data-sitename="${site}"></div>`
    + '<p>Fresh CMS content 😀</p></body></html>';
}
