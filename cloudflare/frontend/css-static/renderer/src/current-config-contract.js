// Exact public native bundles captured with the renderer's Accept-Language
// headers on 2026-11-06. Unknown revisions do not opt into the519 adapter.
export const CURRENT_VIEW_SCRIPTS = Object.freeze({
  es: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.es.evEG0HtR8Ps.O/am=AAAAYAAI/d=1/rs=AGEqA5nxAfWapthEHOE4K2A-y6LqYKA8AA/m=view',
  en: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.en_US.7K42jXwKoL8.O/am=AAAAYAAI/d=1/rs=AGEqA5l1O939Wm7Yi7tplrOF29wrpok45A/m=view',
  fr: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.fr.5qz8a--RjDU.O/am=AAAAYAAI/d=1/rs=AGEqA5llG6Cne3QLlFoEVcnf1RCjwmSVdg/m=view',
  it: 'https://www.gstatic.com/_/atari/_/js/k=atari.vw.it.2UqSqMAe3kM.O/am=AAAAYAAI/d=1/rs=AGEqA5nhH4ZaXhd3lLBzlKY1Ku-eZ2svUA/m=view',
});

export function isCurrentConfigShape(config, redirectUrl) {
  return Array.isArray(config) && config.length === 519 && config[212] === 0
    && config[316] === redirectUrl && config[518] === 0;
}
