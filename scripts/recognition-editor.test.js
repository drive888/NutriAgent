import assert from 'node:assert/strict';
import test from 'node:test';
import { recognitionPrefill, mergeRecognitionFood, recognitionImage } from '../src/lib/recognition-editor.js';

const image = 'data:image/png;base64,iVBORw0KGgo=';

test('a meal review carries the selected photo and leaves unknown nutrition absent', () => {
  const prefill = recognitionPrefill({ kind: 'meal', preview: { name: 'Chicken', amount: 150, unit: 'g' }, image, notes: 'Reviewed photo' });
  assert.equal(prefill.imgUrl, image);
  assert.equal(prefill.name, 'Chicken');
  assert.equal(prefill.portion, 150);
  assert.equal(prefill._recognitionDraft, true);
  assert.equal('nutrition' in prefill, false);
});

test('confirming recognition keeps the existing item identity and handwritten fields', () => {
  const original = { id: 42, name: 'My lunch', brand: 'Home', barcode: '123', notes: 'Keep my notes', proteins: 7, nutrition: { proteins: 7 }, categories: ['custom'] };
  const patch = recognitionPrefill({ kind: 'meal', preview: { name: 'Reviewed lunch', amount: 200, unit: 'g' }, image, notes: 'Photo draft' });
  const result = mergeRecognitionFood(original, patch);
  assert.equal(result.id, 42);
  assert.equal(result.name, 'Reviewed lunch');
  assert.equal(result.brand, 'Home');
  assert.equal(result.barcode, '123');
  assert.equal(result.notes, 'Keep my notes');
  assert.equal(result.proteins, 7);
  assert.deepEqual(result.categories, ['custom']);
  assert.equal(result.imgUrl, image);
  assert.equal(original.name, 'My lunch');
  assert.equal('_recognitionDraft' in result, false);
});

test('label confirmation applies only verified nutrients, including actual zeros', () => {
  const patch = recognitionPrefill({ kind: 'label', name: '', preview: { portion: { amount: 50, unit: 'g' }, calculated: { calories: 120, fat: 0, sodium: null } }, image, notes: 'Label draft' });
  const merged = mergeRecognitionFood({ name: 'Existing food', brand: 'Keep', sodium: 25, nutrition: { sodium: 25 } }, patch);
  assert.equal(merged.name, 'Existing food');
  assert.equal(merged.calories, 120);
  assert.equal(merged.fat, 0);
  assert.equal(merged.sodium, 25);
  assert.deepEqual(merged.nutrition, { sodium: 25, calories: 120, fat: 0 });
  assert.equal(merged.nutrition_basis, 'g');
  assert.equal(merged.imgUrl, image);
});

test('reusing a data URL does not download or pick another image', async () => {
  assert.equal(await recognitionImage(image, { fetcher: () => { throw new Error('must not fetch'); } }), image);
});

test('existing remote photos use safe credentials and preserve request cancellation', async () => {
  const controller = new AbortController();
  let request;
  const result = await recognitionImage('https://example.test/photo.png', {
    signal: controller.signal,
    fetcher: async (url, options) => { request = { url, options }; return { ok: true, blob: async () => new Blob(['photo'], { type: 'image/png' }) }; },
    readBlob: async () => image,
  });
  assert.equal(result, image);
  assert.equal(request.options.credentials, 'same-origin');
  assert.equal(request.options.signal, controller.signal);
});

test('unsupported, oversized or unreachable photos do not produce recognition input', async () => {
  await assert.rejects(recognitionImage('data:text/plain;base64,eA=='));
  await assert.rejects(recognitionImage('https://example.test/missing', { fetcher: async () => ({ ok: false }) }));
  await assert.rejects(recognitionImage('https://example.test/large.png', { fetcher: async () => ({ ok: true, blob: async () => ({ type: 'image/png', size: 7 * 1024 * 1024 }) }) }));
});
