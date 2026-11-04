import { SearchInputError } from './search-protocol.js';

function decode(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new SearchInputError(); }
}

function nativeReader(stream) {
  let reader;
  try { reader = stream.getReader({ mode: 'byob' }); }
  catch (error) {
    if (!(error instanceof TypeError)) throw error;
    return null;
  }
  if (typeof reader.readAtLeast === 'function') return reader;
  reader.releaseLock();
  return null;
}

async function readNative(reader, limit) {
  // readAtLeast transfers this allocation. Only its returned view remains usable.
  // A short result means EOF; a full limit+1 result proves the body is oversized.
  const result = await reader.readAtLeast(limit + 1, new Uint8Array(limit + 1));
  const bytes = result.value ?? new Uint8Array();
  if (bytes.byteLength > limit) { await reader.cancel(); throw new SearchInputError(413); }
  return decode(bytes);
}

async function readGeneric(reader, limit) {
  const bytes = new Uint8Array(limit);
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    const nextSize = size + item.value.byteLength;
    if (nextSize > limit) { await reader.cancel(); throw new SearchInputError(413); }
    bytes.set(item.value, size);
    size = nextSize;
  }
  return decode(bytes.subarray(0, size));
}

export async function readBoundedPageText(stream, limit, lengthHeader) {
  if (lengthHeader && /^\d+$/.test(lengthHeader) && Number(lengthHeader) > limit) throw new SearchInputError(413);
  if (!stream) return '';
  const reader = nativeReader(stream);
  return reader ? readNative(reader, limit) : readGeneric(stream.getReader(), limit);
}
