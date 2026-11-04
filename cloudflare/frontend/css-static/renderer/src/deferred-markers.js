const whitespace = char => char !== undefined && /[\t\n\f\r ]/u.test(char);
const invalid = () => new Error('Deferred document transaction is invalid.');

function startTag(input, offset = 0) {
  if (input[offset] !== '<' || offset + 1 >= input.length || !/[a-z]/iu.test(input[offset + 1])) throw invalid();
  let position = offset + 2;
  while (position < input.length && /[a-z0-9:_-]/iu.test(input[position])) position += 1;
  const openingEnd = position;
  const tagName = input.slice(offset + 1, openingEnd).toLowerCase();
  if (!whitespace(input[position]) && input[position] !== '>' && !(input[position] === '/' && input[position + 1] === '>')) throw invalid();
  let lastAttribute = position;
  const attributes = [];
  while (position < input.length) {
    const spaceStart = position;
    while (whitespace(input[position])) position += 1;
    if (input[position] === '>' || input[position] === '/' && input[position + 1] === '>') {
      const selfClosing = input[position] === '/';
      return { name: tagName, openingEnd, attributes, lastAttribute,
        selfClosing, closeStart: position, end: position + (selfClosing ? 2 : 1) };
    }
    const nameStart = position;
    while (position < input.length && !/[\t\n\f\r =/>"']/u.test(input[position])) position += 1;
    if (position === nameStart) throw invalid();
    const nameEnd = position;
    while (whitespace(input[position])) position += 1;
    if (input[position] === '=') {
      position += 1;
      while (whitespace(input[position])) position += 1;
      const quote = input[position];
      if (quote === '"' || quote === "'") {
        position = input.indexOf(quote, position + 1);
        if (position < 0) throw invalid();
        position += 1;
      } else {
        const valueStart = position;
        while (position < input.length && !/[\t\n\f\r >]/u.test(input[position])) position += 1;
        if (position === valueStart) throw invalid();
      }
    } else position = nameEnd;
    attributes.push({ name: input.slice(nameStart, nameEnd), spaceStart, nameStart, end: position });
    lastAttribute = position;
  }
  throw invalid();
}

// The input is only a native-parser-identified start tag, never a whole HTML
// document. Match HTMLRewriter's quote-only escaping and first-attribute update.
export function applyTagChanges(tag, changes) {
  let result = tag;
  for (const [name, value] of changes) {
    if (!/^[a-z_:][a-z0-9:_.-]*$/iu.test(name) || value !== null && typeof value !== 'string') throw invalid();
    const parsed = startTag(result);
    if (parsed.end !== result.length) throw invalid();
    const index = parsed.attributes.findIndex(item => item.name.toLowerCase() === name.toLowerCase());
    const attribute = parsed.attributes[index];
    const rawAttributes = parsed.attributes.map(item => result.slice(item.nameStart, item.end));
    if (value === null) {
      if (!attribute) continue;
      rawAttributes.splice(index, 1);
    } else {
      const encoded = value.replaceAll('"', '&quot;');
      if (attribute) rawAttributes[index] = `${attribute.name}="${encoded}"`;
      else rawAttributes.push(`${name}="${encoded}"`);
    }
    result = result.slice(0, parsed.openingEnd) + (rawAttributes.length ? ' ' + rawAttributes.join(' ') : '')
      + (parsed.selfClosing ? ' />' : '>');
  }
  return result;
}

export function createDeferredMarkers(source, { limit = 2048 } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 4096) throw invalid();
  let prefix;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = `<!--pll-deferred-${crypto.randomUUID()}:`;
    if (!source.includes(candidate)) { prefix = candidate; break; }
  }
  if (!prefix) throw invalid();
  const records = [];
  function allocate(kind, tagName, data) {
    if (records.length >= limit || tagName !== null && !/^[a-z][a-z0-9:_-]*$/iu.test(tagName)) throw invalid();
    const id = records.length;
    const marker = `${prefix}${id}-->`;
    records.push(Object.freeze({ id, marker, kind, tagName: tagName?.toLowerCase() ?? null, data: Object.freeze({ ...data }) }));
    return marker;
  }
  return {
    prefix,
    tag: (name, data) => allocate('tag', name, data),
    insert: data => allocate('insert', null, data),
    commit(serialized, resolve) {
      const chunks = [];
      const seen = new Set();
      let cursor = 0;
      let lastTagId = -1;
      while (true) {
        const position = serialized.indexOf(prefix, cursor);
        if (position < 0) break;
        chunks.push(serialized.slice(cursor, position));
        const cluster = [];
        let after = position;
        while (serialized.startsWith(prefix, after)) {
          const end = serialized.indexOf('-->', after + prefix.length);
          if (end < 0) throw invalid();
          const idText = serialized.slice(after + prefix.length, end);
          if (!/^\d{1,4}$/u.test(idText)) throw invalid();
          const record = records[Number(idText)];
          if (!record || record.marker !== serialized.slice(after, end + 3) || seen.has(record.id)) throw invalid();
          if (record.kind === 'tag') {
            if (record.id <= lastTagId) throw invalid();
            lastTagId = record.id;
          }
          seen.add(record.id); cluster.push(record); after = end + 3;
          if (record.kind === 'insert' && cluster.length === 1) break;
        }
        if (cluster[0].kind === 'insert') {
          if (cluster.length !== 1) throw invalid();
          const { preceding } = cluster[0].data;
          if (preceding && serialized.slice(position - preceding.length, position) !== preceding) throw invalid();
          const inserted = resolve(cluster[0].data);
          if (typeof inserted !== 'string') throw invalid();
          chunks.push(inserted); cursor = after; continue;
        }
        const tag = startTag(serialized, after);
        if (cluster.some(record => record.kind !== 'tag' || record.tagName !== tag.name)) throw invalid();
        const base = serialized.slice(after, tag.end);
        const decisions = cluster.map(record => resolve(record.data));
        if (!decisions.some(decision => decision?.remove === true)) {
          let patched = base;
          for (const decision of decisions) {
            if (!Array.isArray(decision)) throw invalid();
            patched = applyTagChanges(patched, decision);
          }
          chunks.push(patched);
        }
        cursor = tag.end;
      }
      if (seen.size !== records.length) throw invalid();
      chunks.push(serialized.slice(cursor));
      const output = chunks.join('');
      if (output.includes(prefix)) throw invalid();
      return output;
    },
  };
}
