import { normalizeLabel, normalizeMeal } from '../../src/lib/recognition-contract.js';

export async function recognize(kind, image, { mode = 'service', url, token, fetcher = fetch } = {}) {
  const started = performance.now();
  if (!['meal', 'label'].includes(kind)) throw Object.assign(new Error('Unknown recognition kind'), { status: 400 });
  if (typeof image !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) throw Object.assign(new Error('PNG, JPEG or WebP image required'), { status: 400 });
  let raw;
  if (mode === 'mock') {
    raw = kind === 'meal' ? { candidates: [{ name: 'Mock rice (not image recognition)', category: 'rice' }] }
      : { name: 'Mock label (not OCR)', basis: 'per100g', nutrients: { calories: { value: 100, unit: 'kcal' }, proteins: { value: 3, unit: 'g' } } };
  } else {
    if (!url) throw Object.assign(new Error('Recognition service not configured'), { status: 503 });
    const response = await fetcher(url, { method: 'POST', signal: AbortSignal.timeout(30000), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ kind, image }) });
    if (!response.ok) throw Object.assign(new Error('Recognition provider failed'), { status: 502 });
    raw = await response.json();
  }
  const draft = kind === 'meal' ? normalizeMeal(raw) : normalizeLabel(raw);
  return { ...draft, mode: mode === 'mock' ? 'mock' : 'service', elapsedMs: Math.round(performance.now() - started) };
}
