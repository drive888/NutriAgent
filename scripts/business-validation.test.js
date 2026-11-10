import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFood, validateDiary } from '../server/lib/business-validation.js';
test('food rejects negative, nonfinite nutrients and invalid portions, preserves missing', () => {
  assert.equal(validateFood({name:'Rice', portion:100, nutrition:{fat:null, calories:130}}), null);
  for (const value of [-1, 'abc', Infinity]) assert.ok(validateFood({nutrition:{fat:value}}));
  for (const portion of [0,-1,null,'abc']) assert.ok(validateFood({portion}));
  assert.ok(validateFood({name:'   '}));
});
test('diary validates actual calendar dates, arrays, quantities and nutrition', () => {
  assert.equal(validateDiary('2026-10-30',{items:[{uuid:'a',quantity:1.5,portion:100,nutrition:{calories:130}}]}),null);
  for (const date of ['2026-02-30','bad','2026-13-01']) assert.ok(validateDiary(date,{}));
  assert.ok(validateDiary('2026-10-30',{items:{}}));
  assert.ok(validateDiary('2026-10-30',{items:[{quantity:0}]}));
  assert.ok(validateDiary('2026-10-30',{items:[{nutrition:{fat:-1}}]}));
});
