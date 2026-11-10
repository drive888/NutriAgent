// Only server configuration supplies endpoints. Clients select an opaque engine ID.
function engines(env) {
  const definitions = [
    { id: 'legacy', name: 'Standard recognition', nameZh: '标准识别', kinds: ['meal', 'label'], adapter: 'json', urls: { meal: env.MEAL_RECOGNITION_URL, label: env.LABEL_RECOGNITION_URL }, token: env.RECOGNITION_TOKEN, mode: env.RECOGNITION_MODE === 'mock' ? 'mock' : 'service' },
    { id: 'g31', name: 'G31 · Food-101', nameZh: 'G31 餐食识别', kinds: ['meal'], adapter: 'g31', url: env.G31_RECOGNITION_URL, token: env.G31_RECOGNITION_TOKEN },
  ];
  const extra = JSON.parse(env.RECOGNITION_ENGINES_JSON || '[]');
  if (!Array.isArray(extra)) throw new Error('Invalid recognition engine configuration');
  for (const e of extra) {
    if (!e || !/^[a-z][a-z0-9-]{0,39}$/.test(e.id) || definitions.some(d => d.id === e.id)
      || typeof e.name !== 'string' || !e.name.trim() || e.name.length > 100
      || (e.nameZh != null && (typeof e.nameZh !== 'string' || e.nameZh.length > 100))
      || !['json', 'g31'].includes(e.adapter) || !Array.isArray(e.kinds) || !e.kinds.length
      || e.kinds.some(k => !['meal', 'label'].includes(k)) || (e.adapter === 'g31' && e.kinds.some(k => k !== 'meal'))
      || typeof e.url !== 'string' || !/^https?:\/\//.test(e.url)) throw new Error('Invalid recognition engine configuration');
    definitions.push({ id: e.id, name: e.name, nameZh: e.nameZh || e.name, kinds: e.kinds, adapter: e.adapter, url: e.url, token: e.token });
  }
  return definitions;
}

export function listRecognitionEngines(env = process.env) {
  return engines(env).map(e => ({ id: e.id, name: e.name, nameZh: e.nameZh, kinds: e.kinds,
    configured: Object.fromEntries(e.kinds.map(k => [k, !!(e.url || e.urls?.[k] || e.mode === 'mock')])) }));
}

export function resolveRecognitionEngine(id = 'legacy', kind, env = process.env) {
  const engine = engines(env).find(e => e.id === id);
  if (!engine || !engine.kinds.includes(kind)) throw Object.assign(new Error('Unsupported recognition engine'), { status: 400 });
  const url = engine.url || engine.urls?.[kind];
  if (!url && engine.mode !== 'mock') throw Object.assign(new Error('Recognition service not configured'), { status: 503 });
  return { ...engine, url };
}
