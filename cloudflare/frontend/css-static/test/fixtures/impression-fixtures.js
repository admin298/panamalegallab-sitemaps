import { CSS_NATIVE_URL } from '../../src/css-static.js';

export const IMPRESSION_NONCE = 'ValidNonce123';
export const IMPRESSION_PREVIEW = 'https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev';
export const VIEW_SCRIPTS = Object.freeze({
  es: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.es.qy5mfCdpnEs.O/am=AAAAGAAE/d=1/rs=AGEqA5myW6a9fBZOxA6oOP-YGbdeAZqtvw/m=view',
  en: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.en_US.CY2eaMNW2S0.O/am=AAAAGAAE/d=1/rs=AGEqA5kb6BcqE8ZiALmvuVdjL4tgdVXDVw/m=view',
  fr: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.fr.n7p6j6I-UBA.O/am=AAAAGAAE/d=1/rs=AGEqA5mTu1u34PhOtTHK1HLqd4to_aHlsQ/m=view',
  it: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.it.L62eI84RIxw.O/am=AAAAGAAE/d=1/rs=AGEqA5lO7vpeB4msuV03jy7XAwfq28rwfA/m=view',
});
export const siteName = language => language === 'es' ? 'panamalegallab' : 'panamlegallab-' + language;
export const origin = language => 'https://' + (language === 'es' ? 'www' : language) + '.panamalegallab.com';
export const impressionHeaders = Object.freeze({ 'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy': `script-src 'nonce-${IMPRESSION_NONCE}'`, 'Cache-Control': 'no-store',
  ETag: 'old', 'X-Keep': 'yes' });

export function impressionConfig(value = null) {
  return Array.from({ length: 518 }, (_, index) => index === 212 ? 0 : index === 356 ? value : null);
}
export function impressionScript(value = null) {
  const config = impressionConfig(value);
  config[1] = 'Panamá, français, società 😀; quoted [null], \\"';
  config[100] = ['nested', { text: 'brackets [,] and commas,', number: 9 }];
  return '_at_config = ' + JSON.stringify(config) + ';window.afterConfig="preserved";';
}
export function impressionDocument(language = 'es', { value = null, css = true, script, viewUrl,
  nonce = IMPRESSION_NONCE } = {}) {
  const link = css ? `<link rel="stylesheet" href="${CSS_NATIVE_URL}" data-id="_cl" nonce="LinkNonce456">` : '';
  return `\uFEFF<!doctype html><html><head><meta charset="utf-8">${link}`
    + `<script nonce="${nonce}">${script ?? impressionScript(value)}</script>`
    + `<script src="${viewUrl ?? VIEW_SCRIPTS[language]}" nonce="${IMPRESSION_NONCE}"></script>`
    + `<script async src="https://www.googletagmanager.com/gtag/js?id=G-FNRPN562BY" nonce="${IMPRESSION_NONCE}"></script>`
    + `<script nonce="${IMPRESSION_NONCE}">window.dataLayer=window.dataLayer||[];</script>`
    + `</head><body><div data-domain="panamalegallab.com" data-sitename="${siteName(language)}"></div>`
    + '<p>Fresh CMS content 😀</p></body></html>';
}
export function readConfig(html) {
  const script = /<script\b[^>]*>\s*(_at_config\s*=[\s\S]*?)<\/script>/u.exec(html)?.[1];
  if (!script) return null;
  const json = script.slice(script.indexOf('=') + 1, script.lastIndexOf(';window.afterConfig'));
  return JSON.parse(json);
}

// A unit-test parser fixture only; real HTML parsing is covered separately in Miniflare.
export class ImpressionFixtureRewriter {
  constructor() { this.handlers = []; }
  on(selector, handler) { this.handlers.push([selector, handler]); return this; }
  transform(response) {
    const body = response.clone();
    const invoke = (selector, attrs = {}) => this.handlers.find(row => row[0] === selector)?.[1].element({
      getAttribute: name => attrs[name] ?? null,
    });
    const stream = new ReadableStream({ start: async controller => {
      const text = await body.text();
      for (const tag of ['html', 'head', 'body']) invoke(tag);
      const name = /data-sitename="([^"]+)"/u.exec(text)?.[1];
      invoke('[data-domain][data-sitename]', { 'data-domain': 'panamalegallab.com', 'data-sitename': name });
      invoke('head meta[charset]', { charset: 'utf-8' });
      for (const match of text.matchAll(/<script\b([^>]*)>/gu)) {
        const attrs = Object.fromEntries([...match[1].matchAll(/([a-z-]+)="([^"]*)"/gu)].map(row => [row[1], row[2]]));
        invoke('script', attrs);
      }
      for (const match of text.matchAll(/<link\b([^>]*)>/gu)) {
        const attrs = Object.fromEntries([...match[1].matchAll(/([a-z-]+)="([^"]*)"/gu)].map(row => [row[1], row[2]]));
        invoke('link', attrs); invoke('head link', attrs);
      }
      controller.enqueue(new TextEncoder().encode(text)); controller.close();
    } });
    return new Response(stream);
  }
}
