import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLabel, normalizeMeal, portionNutrition } from '../src/lib/recognition-contract.js';

test('label converts energy and sodium while retaining the per-100ml basis', () => {
  const r = normalizeLabel({ basis: 'per100ml', nutrients: { energy: { value: 418.4, unit: 'kJ' }, sodium: { value: .2, unit: 'g' }, proteins: { value: 3, unit: 'g' } } });
  assert.equal(r.basis, 'per100ml');
  assert.equal(r.nutrition.calories, 100);
  assert.equal(r.nutrition.sodium, 200);
  assert.equal(r.nutrition.fat, null);
  assert.equal(r.requiresConfirmation, true);
});
test('serving data is not silently interpreted as per-100g', () => {
  const r = normalizeLabel({ basis: 'perServing', serving: { amount: 30, unit: 'g' }, nutrients: { calories: { value: 120, unit: 'kcal' } } });
  assert.equal(portionNutrition(r, 60, 'g').calories, 240);
});
test('invalid, NRV and incompatible values are not silently accepted', () => {
  assert.throws(() => normalizeLabel({ basis: 'per100g', nutrients: { fat: { value: -1, unit: 'g' } } }));
  assert.throws(() => normalizeLabel({ basis: 'per100g', nutrients: { fat: { value: 10, unit: '%' } } }));
  assert.throws(() => portionNutrition({ basis: 'per100ml', nutrition: { calories: 100 } }, 50, 'g'));
  assert.throws(() => portionNutrition({ basis: 'per100g', nutrition: {} }, 0, 'g'));
});
test('meal candidates require confirmation and never invent confidence', () => {
  const r = normalizeMeal({ candidates: [{ name: ' rice ', category: 'rice' }] });
  assert.equal(r.candidates[0].name, 'rice');
  assert.equal(r.candidates[0].confidence, null);
  assert.equal(r.requiresConfirmation, true);
  assert.equal(normalizeMeal({ candidates: [] }).status, 'unknown');
  assert.throws(() => normalizeMeal({ candidates: [{ name: 'rice', confidence: 5 }] }));
});
