import test from 'node:test';
import assert from 'node:assert/strict';
import { listRecognitionEngines, resolveRecognitionEngine } from '../server/lib/recognition-engines.js';
import { recognize } from '../server/lib/recognition-service.js';
import { normalizeMeal, reviewMeal } from '../src/lib/recognition-contract.js';
import { recognitionPrefill } from '../src/lib/recognition-editor.js';

const env = { MEAL_RECOGNITION_URL: 'http://legacy/recognize', LABEL_RECOGNITION_URL: 'http://legacy/recognize', G31_RECOGNITION_URL: 'http://g31/predict', RECOGNITION_TOKEN: 'private-token' };
const image = 'data:image/png;base64,iVBORw0KGgo=';

test('engine listing exposes capabilities without provider addresses or credentials', () => {
  const engines = listRecognitionEngines(env);
  assert.deepEqual(engines.find(e => e.id === 'g31').kinds, ['meal']);
  assert.equal(engines.find(e => e.id === 'legacy').configured.meal, true);
  assert.equal(JSON.stringify(engines).includes('http:'), false);
  assert.equal(JSON.stringify(engines).includes('private-token'), false);
  assert.equal(listRecognitionEngines({}).find(e => e.id === 'g31').configured.meal, false);
});

test('selection rejects unknown IDs, unsupported kinds and missing service; old clients retain legacy', () => {
  assert.equal(resolveRecognitionEngine(undefined, 'meal', env).id, 'legacy');
  assert.throws(() => resolveRecognitionEngine('http://arbitrary', 'meal', env), e => e.status === 400);
  assert.throws(() => resolveRecognitionEngine('g31', 'label', env), e => e.status === 400);
  assert.throws(() => resolveRecognitionEngine('g31', 'meal', {}), e => e.status === 503);
});

test('another configured JSON engine can be added without changing the UI', () => {
  const config = { ...env, RECOGNITION_ENGINES_JSON: JSON.stringify([{ id: 'next', name: 'Next model', nameZh: '下一引擎', kinds: ['meal'], adapter: 'json', url: 'http://next/recognize', token: 'hidden' }]) };
  assert.equal(listRecognitionEngines(config).find(e => e.id === 'next').name, 'Next model');
  assert.equal(resolveRecognitionEngine('next', 'meal', config).url, 'http://next/recognize');
  assert.equal(JSON.stringify(listRecognitionEngines(config)).includes('hidden'), false);
  assert.throws(() => listRecognitionEngines({ RECOGNITION_ENGINES_JSON: '[{"id":"legacy"}]' }));
});

test('G31 sends multipart image and keeps complete ranked labels and calibrated confidence', async () => {
  let sent;
  const draft = await recognize('meal', image, { adapter: 'g31', url: env.G31_RECOGNITION_URL, fetcher: async (url, options) => {
    sent = { url, options };
    return { ok: true, json: async () => ({ model_version: 'food101-test', predictions: [
      { label: 'pizza', confidence: .81 }, { label: 'garlic_bread', confidence: .12 }, { label: 'unlisted_dish', confidence: .03 },
    ] }) };
  } });
  assert.ok(sent.options.body instanceof FormData);
  assert.equal(sent.options.body.get('image').type, 'image/png');
  assert.equal(sent.options.headers?.['Content-Type'], undefined);
  assert.deepEqual(draft.candidates.map(c => c.label), ['pizza', 'garlic_bread', 'unlisted_dish']);
  assert.equal(draft.candidates[0].confidence, .81);
  assert.equal(draft.modelVersion, 'food101-test');
  assert.equal(draft.candidates[0].nameZh, '披萨');
  assert.equal(draft.candidates[2].nutrition, undefined);
});

test('review uses per100g demo seed, manual grams, actual zeros and unknown nutrients', async () => {
  const draft = await recognize('meal', image, { adapter: 'g31', url: 'http://g31', fetcher: async () => ({ ok: true, json: async () => ({ predictions: [{ label: 'pizza', confidence: .8 }, { label: 'chicken_wings', confidence: .1 }, { label: 'unknown', confidence: .01 }] }) }) });
  const pizza = draft.candidates[0];
  assert.equal(pizza.portions.medium, 200);
  const review = reviewMeal(pizza, { amount: 200, unit: 'g', name: 'Reviewed pizza' });
  assert.equal(review.calculated.calories, 532);
  assert.equal(review.calculated.sodium, null);
  assert.equal(reviewMeal(pizza, { amount: 50, unit: 'g' }).calculated.calories, 133);
  assert.equal(reviewMeal(draft.candidates[1], { amount: 100, unit: 'g' }).calculated.carbohydrates, 0);
  const unknown = reviewMeal(draft.candidates[2], { amount: 125, unit: 'g' });
  assert.equal(unknown.calculated, undefined);
  assert.throws(() => reviewMeal(pizza, { amount: 200, unit: 'ml' }));
  assert.throws(() => reviewMeal(pizza, { amount: Infinity, unit: 'g' }));
  const prefill = recognitionPrefill({ kind: 'meal', preview: review, image, notes: 'Reference estimate' });
  assert.equal(prefill.nutrition.calories, 532);
  assert.equal(prefill.nutrition.sodium, undefined);
  assert.equal(prefill.portion, 200);
  assert.equal(prefill.nutrition_basis, 'g');
});

test('malformed G31 predictions and invalid optional nutrition fail closed', async () => {
  for (const predictions of [[], [{ label: '', confidence: .5 }], [{ label: 'pizza', confidence: 2 }]]) {
    await assert.rejects(recognize('meal', image, { adapter: 'g31', url: 'http://g31', fetcher: async () => ({ ok: true, json: async () => ({ predictions }) }) }));
  }
  assert.throws(() => normalizeMeal({ candidates: [{ name: 'Pizza', nutrition: { source: 'demo_seed', per100g: { calories: -1 } } }] }));
});

test('provider failures and timeouts propagate without substituting another engine', async () => {
  await assert.rejects(recognize('meal', image, { adapter: 'g31', url: 'http://g31', fetcher: async () => ({ ok: false }) }), e => e.status === 502);
  await assert.rejects(recognize('meal', image, { adapter: 'g31', url: 'http://g31', fetcher: async () => { throw new DOMException('timeout', 'TimeoutError'); } }), e => e.name === 'TimeoutError');
});
