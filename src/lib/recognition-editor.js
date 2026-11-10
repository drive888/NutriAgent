const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxBytes = 6 * 1024 * 1024;

// Recognition produces a review patch, never a replacement for the editor draft.
export function recognitionPrefill({ kind, preview, name, image, notes }) {
  const portion = kind === 'label' ? preview.portion : preview;
  const patch = {
    _recognitionDraft: true,
    name: kind === 'label' ? (name || '') : preview.name,
    imgUrl: image,
    portion: Number(portion.amount),
    unit: portion.unit,
    notes,
  };
  if (kind === 'label') {
    patch.nutrition_basis = portion.unit;
    patch.nutrition = Object.fromEntries(Object.entries(preview.calculated).filter(([, value]) => value != null));
  }
  return patch;
}

export function mergeRecognitionFood(existing, patch) {
  const { _recognitionDraft, nutrition, ...review } = patch;
  const merged = { ...existing, ...review, name: review.name?.trim() || existing.name, notes: existing.notes || review.notes };
  if (nutrition) {
    merged.nutrition = { ...existing.nutrition, ...nutrition };
    Object.assign(merged, nutrition);
  }
  delete merged._recognitionDraft;
  return merged;
}

function readImageBlob(blob, signal) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const abort = () => reader.abort();
    const cleanup = () => signal?.removeEventListener('abort', abort);
    reader.onload = () => { cleanup(); resolve(reader.result); };
    reader.onerror = () => { cleanup(); reject(reader.error); };
    reader.onabort = () => { cleanup(); reject(new DOMException('Aborted', 'AbortError')); };
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    signal?.addEventListener('abort', abort, { once: true });
    reader.readAsDataURL(blob);
  });
}

export async function recognitionImage(source, { fetcher = fetch, signal, readBlob = readImageBlob } = {}) {
  if (source.startsWith('data:')) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(source);
    if (!match || match[2].length * 3 / 4 > maxBytes) throw new Error('Unsupported or oversized photo');
    return source;
  }
  const response = await fetcher(source, { credentials: 'same-origin', signal });
  if (!response.ok) throw new Error('Photo could not be loaded');
  const blob = await response.blob();
  if (!imageTypes.has(blob.type) || blob.size > maxBytes) throw new Error('Unsupported or oversized photo');
  return readBlob(blob, signal);
}
