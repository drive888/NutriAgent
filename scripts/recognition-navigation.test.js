import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const bottom = readFileSync(new URL('../src/components/layout/BottomNav.svelte', import.meta.url), 'utf8');
const sidebar = readFileSync(new URL('../src/components/layout/Sidebar.svelte', import.meta.url), 'utf8');
const tabs = ['/', '/foods', '/statistics', '/goals', '/settings'].map(path => ({ path }));
const bottomBody = bottom.match(/\$: activeIdx = \(\(\) => \{([\s\S]*?)\}\)\(\);/)[1];
const bottomIndex = new Function('$location', 'tabs', bottomBody);
const sidebarPath = sidebar.match(/\$: activePath = ([^;]+);/)[1];
const sidebarBody = sidebar.match(/function isTabActive\(itemPath\) \{([\s\S]*?)\n  \}/)[1];
const sidebarActive = new Function('$location', 'itemPath', `const activePath = ${sidebarPath}; ${sidebarBody}`);

test('photo recognition belongs to Foods in both navigation surfaces', () => {
  for (const route of ['/recognition', '/recognition?kind=label']) {
    assert.equal(tabs[bottomIndex(route, tabs)].path, '/foods');
    assert.equal(sidebarActive(route, '/foods'), true);
    assert.equal(sidebarActive(route, '/'), false);
  }
});

test('existing parent routes keep their navigation selection', () => {
  for (const [route, expected] of [['/', '/'], ['/foods/edit/42', '/foods'], ['/settings/appearance', '/settings'], ['/statistics', '/statistics']]) {
    assert.equal(tabs[bottomIndex(route, tabs)].path, expected);
    assert.equal(sidebarActive(route, expected), true);
  }
});
