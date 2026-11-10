import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from '@formatjs/icu-messageformat-parser';

function flatten(object, prefix = '') {
  return Object.fromEntries(Object.entries(object).flatMap(([key, value]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' ? Object.entries(flatten(value, name)) : [[name, value]];
  }));
}
const en = flatten(JSON.parse(fs.readFileSync(new URL('../src/i18n/en.json', import.meta.url))));
const zh = flatten(JSON.parse(fs.readFileSync(new URL('../src/i18n/zh_Hans.json', import.meta.url))));

function argumentsIn(nodes, names = new Set()) {
  for (const node of nodes) {
    if ([1, 2, 3, 4, 5, 6].includes(node.type)) names.add(node.value);
    if (node.children) argumentsIn(node.children, names);
    for (const option of Object.values(node.options || {})) argumentsIn(option.value, names);
  }
  return [...names].sort();
}

test('Simplified Chinese covers every English UI message without orphan keys', () => {
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
  for (const [key, value] of Object.entries(zh)) assert.ok(typeof value === 'string' && value.trim(), key);
});

test('Chinese messages preserve ICU arguments and HTML tags and remain formattable', () => {
  const failures = [];
  for (const [key, source] of Object.entries(en)) {
    if (!zh[key]) continue;
    try {
      const options = { ignoreTag: true };
      assert.deepEqual(argumentsIn(parse(zh[key], options)), argumentsIn(parse(source, options)));
      const tags = text => (text.match(/<\/?[a-z][^>]*>/gi) || []).sort();
      assert.deepEqual(tags(zh[key]), tags(source));
    } catch (error) { failures.push(`${key}: ${error.message}`); }
  }
  assert.deepEqual(failures, []);
});
