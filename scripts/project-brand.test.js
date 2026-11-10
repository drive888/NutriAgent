import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('web, API and PWA use the NutriAgent project name', () => {
  assert.equal(JSON.parse(read('package.json')).name, 'nutriagent');
  assert.equal(JSON.parse(read('package-lock.json')).packages[''].name, 'nutriagent');
  assert.equal(JSON.parse(read('server/package.json')).name, 'nutriagent-api');
  assert.match(read('index.html'), /<title>NutriAgent<\/title>/);
  assert.match(read('vite.config.js'), /name: 'NutriAgent'/);
  assert.match(read('vite.config.js'), /short_name: 'NutriAgent'/);
});

test('Android package, app label and source directory agree', () => {
  assert.match(read('capacitor.config.ts'), /appId: 'com\.nutriagent\.app'/);
  assert.match(read('android/app/build.gradle'), /applicationId "com\.nutriagent\.app"/);
  assert.match(read('android/app/src/main/res/values/strings.xml'), /name="app_name">NutriAgent</);
  assert.ok(existsSync(new URL('../android/app/src/main/java/com/nutriagent/app/MainActivity.java', import.meta.url)));
  assert.match(read('android/app/src/main/java/com/nutriagent/app/MainActivity.java'), /package com\.nutriagent\.app/);
});

test('renamed assistant modules and public API identifier resolve', () => {
  assert.match(read('src/App.svelte'), /components\/ai\/NutriAgent\.svelte/);
  assert.match(read('src/lib/api.js'), /export const NaApi =/);
  assert.ok(existsSync(new URL('../src/components/settings/SettingsAgent.svelte', import.meta.url)));
});

test('renaming preserves existing browser storage and encrypted tokens', () => {
  assert.match(read('src/lib/db.js'), /DB_NAME = 'nutritrace'/);
  assert.match(read('src/lib/db-native.js'), /DB_NAME = 'nutritrace_local'/);
  assert.match(read('server/lib/token-crypto.js'), /SALT\s*= 'nutritrace\.token-crypto\.v1'/);
});
