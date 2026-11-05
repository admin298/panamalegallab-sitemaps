// Read-only lexical spans supplement the native structural parser. ASCII folding
// preserves original offsets, including source text with Unicode case mappings.
export function collectRawTextSpans(html) {
  if (typeof html !== 'string') return null;
  const lower = html.replace(/[A-Z]/gu, letter => letter.toLowerCase()), spans = [];
  const starts = /<!--|<(script|style|title|textarea|xmp|iframe|noembed|noframes|noscript)\b[^<>]*>/giu;
  let match;
  while ((match = starts.exec(html)) !== null) {
    const openEnd = starts.lastIndex;
    const kind = match[0] === '<!--' ? 'comment' : match[1].toLowerCase();
    let contentEnd, end;
    if (kind === 'comment') {
      contentEnd = html.indexOf('-->', openEnd);
      if (contentEnd < 0) return null;
      end = contentEnd + 3;
    } else {
      contentEnd = lower.indexOf('</' + kind, openEnd);
      if (contentEnd < 0) return null;
      const closing = /^<\/[a-z]+\s*>/iu.exec(html.slice(contentEnd, contentEnd + 256));
      if (!closing || !closing[0].toLowerCase().startsWith('</' + kind)
        || !/^\s*>$/u.test(closing[0].slice(kind.length + 2))) return null;
      end = contentEnd + closing[0].length;
    }
    spans.push(Object.freeze({ start: match.index, end, kind, openEnd, contentEnd }));
    starts.lastIndex = end;
  }
  return spans;
}

export function elementAttributes(tag, name) {
  if (typeof tag !== 'string' || !/^[a-z][a-z0-9-]*$/u.test(name)
    || !new RegExp('^<' + name + '\\b[^<>]*>$', 'iu').test(tag)) return null;
  const attrs = new Map(); let offset = name.length + 1, rest = tag.slice(offset, -1);
  while (rest.length) {
    if (/^\s*\/?\s*$/u.test(rest)) break;
    const match = /^\s+([a-z_:][a-z0-9_:.-]*)(?:\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)'))?/iu.exec(rest);
    if (!match) return null;
    const field = match[1].toLowerCase();
    if (attrs.has(field)) return null;
    const value = match[2] ?? match[3] ?? '', equals = match[0].indexOf('=');
    attrs.set(field, { value, start: offset + (equals < 0 ? match[0].length : match[0].search(/["']/u) + 1), length: value.length });
    offset += match[0].length; rest = rest.slice(match[0].length);
  }
  return attrs;
}

export function applyTextEdits(html, edits) {
  const ordered = [...edits].sort((left, right) => left.start - right.start);
  let end = 0;
  for (const edit of ordered) {
    if (!Number.isSafeInteger(edit.start) || !Number.isSafeInteger(edit.end) || edit.start < end
      || edit.start < 0 || edit.end < edit.start || edit.end > html.length || typeof edit.replacement !== 'string') return null;
    end = edit.end;
  }
  let result = html;
  for (const edit of ordered.toReversed()) result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
  return result;
}
