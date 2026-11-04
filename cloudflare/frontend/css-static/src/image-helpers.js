const CDN = 'https://lh7-us.googleusercontent.com/sitesv-images-rt/';
const noncePattern = /^[A-Za-z0-9+/_-]{8,256}={0,2}$/u;
const safeJson = value => JSON.stringify(value).replaceAll('<', '\\u003c')
  .replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');

export function approvedProcessUrl(value) {
  if (typeof value !== 'string' || value.length > 4096
    || !value.startsWith(CDN) || !/^[A-Za-z0-9_-]+=w1280$/u.test(value.slice(CDN.length))) return null;
  try {
    const url = new URL(value);
    return url.href === value && !url.port && !url.username && !url.password && !url.search && !url.hash ? value : null;
  } catch { return null; }
}

function representations(url) {
  return [url, url.replaceAll('/', '\\/')].flatMap(value =>
    ['=', '\\u003d', '\\u003D', '\\x3d', '\\x3D'].map(equals => value.replace('=', equals)));
}

export function rewriteReferences(html, original) {
  if (!approvedProcessUrl(original)) return null;
  const token = original.slice(CDN.length, -'=w1280'.length);
  const matches = [];
  for (const form of representations(original)) {
    let from = 0, at;
    while ((at = html.indexOf(form, from)) !== -1) {
      const end = at + form.length;
      const right=html[end];
      const safeRight=right && (/[\s"')<>]/u.test(right) || (right==='\\' && /["']/u.test(html[end+1]??'')));
      if ((at && !/[\s"'(=<>]/u.test(html[at - 1])) || !safeRight) return null;
      matches.push({start:at,end}); from=end;
      if(matches.length > 64) return null;
    }
  }
  if (!matches.length) return null;
  // A bounded read-only classifier catches unsupported fully escaped JS URLs.
  // It never becomes response output: only known exact original spans are edited.
  const classified=html.replace(/\\u\{([0-9a-f]{1,6})\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})|\\\//giu,
    (match,braced,unicode,hex)=>{
      if(match==='\\/')return '/';
      const code=parseInt(braced??unicode??hex,16);return code<=127?String.fromCharCode(code):match;
    });
  let semanticCount=0;
  for(let at=classified.indexOf(token);at!==-1;at=classified.indexOf(token,at+token.length))semanticCount++;
  if(semanticCount!==matches.length)return null;
  // Every literal selected token must occur inside one approved complete URI.
  for(let at=html.indexOf(token);at!==-1;at=html.indexOf(token,at+token.length)) {
    if(!matches.some(span=>at>=span.start && at+token.length<=span.end)) return null;
  }
  // Detect unsupported escaped token/scheme spellings near the native CDN path.
  // This decodes a bounded classifier only; no decoded JS is emitted.
  for(const match of html.matchAll(/sitesv-images-rt(?:\/|\\\/)([^"'<>\s)]{1,4096})/gu)) {
    const decoded=match[1].replace(/\\u00([0-9a-f]{2})|\\x([0-9a-f]{2})/giu,
      (_,unicode,hex)=>String.fromCharCode(parseInt(unicode??hex,16)));
    if(decoded.includes(token) && !matches.some(span=>match.index>=span.start && match.index<span.end)) return null;
  }
  let result=html;
  for(const {end} of matches.sort((a,b)=>b.start-a.start)) result=result.slice(0,end)+'-rw'+result.slice(end);
  return result;
}

export function authorizedNonce(csp, nonces) {
  const unique=[...new Set(nonces)];
  if(unique.length!==1 || !noncePattern.test(unique[0]) || typeof csp!=='string'
    || !csp.length || csp.length>16384 || /[\u0000-\u001f\u007f]/u.test(csp)) return null;
  for(const policy of csp.split(',')) {
    const directives=new Map();
    for(const raw of policy.split(';')) {
      const values=raw.trim().split(/\s+/u);const name=values.shift()?.toLowerCase();
      if(!name) continue;
      if(!/^[a-z][a-z-]*$/u.test(name) || directives.has(name)) return null;
      directives.set(name,values);
    }
    if(directives.has('sandbox') && !directives.get('sandbox').includes('allow-scripts')) return null;
    const effective=directives.get('script-src-elem')??directives.get('script-src')??directives.get('default-src');
    if(!effective?.includes(`'nonce-${unique[0]}'`)) return null;
  }
  return unique[0];
}

export function fallbackScript(original, variant) {
  // Both URLs passed here have already met the fixed ASCII CDN contract.
  // Match exact URLs so native clones/lightboxes of the same asset also recover.
  return `(()=>{const o=${safeJson(original)},v=${safeJson(variant)},seen=new WeakSet;document.addEventListener('error',e=>{const n=e.target;if(!n||n.tagName!=='IMG'||seen.has(n)||(n.getAttribute('src')!==v&&n.currentSrc!==v))return;seen.add(n);n.setAttribute('src',o)},true)})();`;
}

export function insertFallback(html, script, nonce) {
  if(!noncePattern.test(nonce)) return null;
  // Conservative textual splice: native parser separately proves one real HEAD.
  // Attribute quoting/embedded HEAD strings outside this narrow shape fail soft.
  const heads=[...html.matchAll(/<head(?:\s[^<>]*)?>/giu)];
  if(heads.length!==1 || /["']/u.test(heads[0][0])) return null;
  const end=heads[0].index+heads[0][0].length;
  return html.slice(0,end)+`<script nonce="${nonce}" data-pll-image-fallback="v1">${script}</script>`+html.slice(end);
}
