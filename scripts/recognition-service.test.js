import test from 'node:test';
import assert from 'node:assert/strict';
import { recognize } from '../server/lib/recognition-service.js';
const image = 'data:image/png;base64,iVBORw0KGgo=';
test('missing real service returns unavailable rather than fake recognition', async () => {
  await assert.rejects(recognize('meal', image, {}), e => e.status === 503);
});
test('mock mode is explicit and drafts never save records', async () => {
  const r = await recognize('label', image, { mode: 'mock' });
  assert.equal(r.mode, 'mock');
  assert.equal(r.requiresConfirmation, true);
});
test('adapter validates real output and omits model confidence when absent', async () => {
  const fetcher = async () => ({ ok: true, json: async () => ({ candidates: [{ name: 'Rice', category: 'rice' }] }) });
  const r = await recognize('meal', image, { url: 'http://model.test/meal', fetcher });
  assert.equal(r.mode, 'service');
  assert.equal(r.candidates[0].confidence, null);
});
test('malformed model output fails rather than becoming a successful draft', async () => {
  await assert.rejects(recognize('label', image, { url: 'http://model.test/label', fetcher: async () => ({ ok: true, json: async () => ({ basis: 'per100g', nutrients: { fat: { value: -1, unit: 'g' } } }) }) }));
});
