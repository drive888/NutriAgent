import { normalizeLabel, normalizeMeal } from '../../src/lib/recognition-contract.js';
import { g31Candidates } from './recognition-g31.js';

export async function recognize(kind, image, { mode = 'service', adapter = 'json', url, token, fetcher = fetch } = {}) {
  const started = performance.now();
  if (!['meal', 'label'].includes(kind)) throw Object.assign(new Error('Unknown recognition kind'), { status: 400 });
  if (typeof image !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) throw Object.assign(new Error('PNG, JPEG or WebP image required'), { status: 400 });
  let raw;
  if (mode === 'mock') {
    raw = kind === 'meal' ? { candidates: [{ name: 'Mock rice (not image recognition)', category: 'rice' }] }
      : { name: 'Mock label (not OCR)', basis: 'per100g', nutrients: { calories: { value: 100, unit: 'kcal' }, proteins: { value: 3, unit: 'g' } } };
  } else {
    if (!url) throw Object.assign(new Error('Recognition service not configured'), { status: 503 });
    if (!['json', 'g31'].includes(adapter) || (adapter === 'g31' && kind !== 'meal')) throw Object.assign(new Error('Unsupported recognition adapter'), { status: 400 });
    let body = JSON.stringify({ kind, image });
    const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (adapter === 'g31') {
      const [, type, bytes] = /^data:(image\/\w+);base64,(.+)$/.exec(image);
      body = new FormData();
      body.append('image', new Blob([Buffer.from(bytes, 'base64')], { type }), `photo.${type.split('/')[1]}`);
    } else headers['Content-Type'] = 'application/json';
    const response = await fetcher(url, { method: 'POST', signal: AbortSignal.timeout(30000), headers, body });
    if (!response.ok) throw Object.assign(new Error('Recognition provider failed'), { status: 502 });
    raw = await response.json();
  }
  const draft = kind === 'meal' ? normalizeMeal(adapter === 'g31' && mode !== 'mock' ? g31Candidates(raw) : raw) : normalizeLabel(raw);
  return { ...draft, ...(adapter === 'g31' && typeof raw.model_version === 'string' ? { modelVersion: raw.model_version.slice(0, 100) } : {}), mode: mode === 'mock' ? 'mock' : 'service', elapsedMs: Math.round(performance.now() - started) };
}
