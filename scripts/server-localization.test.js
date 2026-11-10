import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { normalizeLanguage, acceptLanguage, userLanguage, requestLanguage, translateServerText, translateNotification, localizeJsonErrors } from '../server/lib/localization.js';
import { chineseEmail } from '../server/lib/email-localization.js';
import { validateFood, validateDiary } from '../server/lib/business-validation.js';

function savedLanguage(value) {
  return { prepare(sql) {
    assert.match(sql, /key = 'language' AND deleted_at IS NULL/);
    return { get(id) { assert.equal(id, 7); return { value }; } };
  } };
}

test('recognizes the registered Chinese locale and legacy saved locale', () => {
  for (const lang of ['zh-CN', 'zh_Hans', 'zh-Hans', 'zh-SG', 'zh']) assert.equal(normalizeLanguage(lang), 'zh-CN');
  assert.equal(normalizeLanguage('en-US'), 'en');
  assert.equal(normalizeLanguage('zh-TW'), null);
  assert.equal(normalizeLanguage(null), null);
});

test('Accept-Language honors quality, exclusions and supported fallback', () => {
  assert.equal(acceptLanguage('en;q=0.5, zh-CN;q=0.9'), 'zh-CN');
  assert.equal(acceptLanguage('zh-CN;q=0,en-US;q=0.8'), 'en');
  assert.equal(acceptLanguage('fr, zh-Hans;q=0.9'), 'zh-CN');
  assert.equal(acceptLanguage('zh;q=2,zh-CN;q=NaN,en;q=0'), null);
});

test('reads the real language setting, handles malformed or absent values', () => {
  assert.equal(userLanguage(savedLanguage('"zh_Hans"'), 7), 'zh-CN');
  assert.equal(userLanguage(savedLanguage('"en"'), 7), 'en');
  assert.equal(userLanguage(savedLanguage('{bad'), 7), 'en');
  assert.equal(userLanguage(savedLanguage(undefined), 7), 'en');
  assert.equal(userLanguage(null, null), 'en');
});

test('request language overrides stored language and supports API identities', () => {
  const db = savedLanguage('"zh_Hans"');
  assert.equal(requestLanguage({ headers: { 'accept-language': 'en' }, user: { id: 7 } }, db), 'en');
  assert.equal(requestLanguage({ headers: {}, user: { id: 7 } }, db), 'zh-CN');
  assert.equal(requestLanguage({ headers: {}, apiUser: { id: 7 } }, db), 'zh-CN');
  assert.equal(requestLanguage({ headers: { 'accept-language': 'zh-CN' } }, null), 'zh-CN');
});

test('owned validation errors translate while field names and inserted values remain exact', () => {
  assert.equal(translateServerText(validateFood({ name: '' }), 'zh-CN'), '食物名称不能为空');
  assert.equal(translateServerText(validateFood({ nutrition: { sodium: -1 } }), 'zh-CN'), '营养素 sodium 无效');
  assert.equal(translateServerText(validateDiary('2026-02-31', {}), 'zh-CN'), '日记日期无效');
  assert.equal(translateServerText('Too many requests. Try again in 42s.', 'zh-CN'), '请求过于频繁，请在 42 秒后重试。');
  assert.equal(translateServerText('Payload too large (123 bytes; max 100)', 'zh-CN'), '请求内容过大（123 字节；最多 100 字节）');
  assert.equal(translateServerText('Parse failed: Empty file', 'zh-CN'), '解析失败：文件为空');
});

test('English, third-party diagnostics and protocol identifiers remain unchanged', () => {
  for (const text of ['Not found', 'Food name must not be blank', 'Too many requests. Try again in 42s.', 'invalid_request', 'invalid_token', 'upstream opaque diagnostic']) {
    assert.equal(translateServerText(text, 'en'), text);
  }
  assert.equal(translateServerText('invalid_request', 'zh-CN'), 'invalid_request');
  assert.equal(translateServerText('upstream opaque diagnostic', 'zh-CN'), 'upstream opaque diagnostic');
});

test('the response boundary preserves API contracts, nested protocol errors and user content', () => {
  const req = { headers: { 'accept-language': 'zh-CN' } };
  let received;
  const res = { statusCode: 400, json(body) { received = body; return this; }, send(body) { received = body; return this; } };
  let calls = 0;
  localizeJsonErrors(null)(req, res, () => calls++);
  assert.equal(calls, 1);
  const input = { error: 'Not found', code: 'not_found', field: 'name', food: { name: 'Not found' } };
  assert.equal(res.json(input), res);
  assert.deepEqual(received, { ...input, error: '未找到' });
  assert.equal(input.error, 'Not found', 'does not mutate original response');
  const rpc = { jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' } };
  res.json(rpc);
  assert.equal(received, rpc);
  res.send('Provider not found');
  assert.equal(received, '未找到身份提供方');
  res.statusCode = 200;
  res.send('Not found');
  assert.equal(received, 'Not found');
});

test('HTTP requests receive their own language without changing the status or machine code', async t => {
  const server = createServer((req, res) => {
    res.json = function (body) { this.setHeader('Content-Type', 'application/json'); this.end(JSON.stringify(body)); return this; };
    res.send = function (body) { this.end(body); return this; };
    localizeJsonErrors(null)(req, res, () => {
      res.statusCode = 400;
      res.json({ error: validateFood({ portion: -2 }), code: 'bad_portion', name: 'My English Food' });
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const responses = await Promise.all(['zh-CN', 'en'].map(language => fetch(base, { headers: { 'Accept-Language': language } })));
  assert.ok(responses.every(response => response.status === 400));
  const [zh, en] = await Promise.all(responses.map(response => response.json()));
  assert.deepEqual(zh, { error: '份量必须是正数', code: 'bad_portion', name: 'My English Food' });
  assert.deepEqual(en, { error: 'Portion must be a positive number', code: 'bad_portion', name: 'My English Food' });
});

test('push reminders and summary interpolate values without translating custom meal names', () => {
  assert.equal(translateNotification('Time to log your Team Lunch!', 'zh-CN'), '该记录您的Team Lunch了！');
  assert.equal(translateNotification('10,000 steps — goal was 8,000!', 'zh-CN'), '已走 10,000 步，目标为 8,000 步！');
  assert.equal(translateNotification('Avg steps: 5,000\nAvg sleep: 7h 30m\nMarked complete: 4 of 7 days', 'zh-CN'), '平均步数：5,000\n平均睡眠：7 小时 30 分钟\n已标记完成：4 / 7 天');
  assert.equal(translateNotification('Bedtime in 30 min — start winding down. Aim for 8h tonight — time to wind down.', 'zh-CN'), '30 分钟后就寝，请开始放松。今晚争取睡够 8 小时，该放松准备休息了。');
  assert.equal(translateNotification('💧 Hydration Reminder', 'en'), '💧 Hydration Reminder');
});

test('all transactional Chinese emails render with escaped user names and exact plaintext', () => {
  const data = { name: '<Eve & Bob>', sender: '<Admin & Co>', item: '<Fish & Chips>', url: 'https://example.test/#/invite?x=1&b="2"', weekRange: '11月1日 – 11月7日', rows: [['平均蛋白质', 42, 'g'], ['无数据', null]] };
  for (const type of ['test', 'reset', 'invite', 'food', 'meal', 'weekly']) {
    assert.equal(chineseEmail(type, data, 'en'), null, 'keeps original English template branch');
    const mail = chineseEmail(type, data, 'zh_Hans');
    assert.match(mail.subject, /[\u4e00-\u9fff]/);
    assert.match(mail.body, /您好 &lt;Eve &amp; Bob&gt;/);
    assert.doesNotMatch(mail.body, /<(?:Admin|Fish|Eve)/);
    assert.match(mail.text, /<Eve & Bob>/);
  }
  const mail = chineseEmail('food', data, 'zh-CN');
  assert.match(mail.body, /&lt;Fish &amp; Chips&gt;/);
  assert.match(mail.body, /x=1&amp;b=&quot;2&quot;/);
  assert.match(mail.text, /<Fish & Chips>/);
});

test('weekly email drops missing values while keeping zero and nutrition units', () => {
  const mail = chineseEmail('weekly', { weekRange: '本周', rows: [['蛋白质', 42, 'g'], ['目标差值', 0, 'kcal'], ['无数据', null]] }, 'zh-CN');
  assert.match(mail.text, /蛋白质：42 g/);
  assert.match(mail.text, /目标差值：0 kcal/);
  assert.doesNotMatch(mail.text, /无数据/);
});

test('server installs localization before body parsing, and tests/invites receive request language', () => {
  const server = readFileSync(new URL('../server/index.js', import.meta.url), 'utf8');
  assert.ok(server.indexOf('router.use(localizeJsonErrors(db))') < server.indexOf('express.json('));
  const auth = readFileSync(new URL('../server/routes/auth.js', import.meta.url), 'utf8');
  assert.match(auth, /sendInvite\(email, inviteUrl, inviterName, requestLanguage\(req, db\)\)/);
  const email = readFileSync(new URL('../server/email.js', import.meta.url), 'utf8');
  assert.match(email, /localizedMail\('reset',.*recipientLanguage\(email\)/);
  assert.match(email, /localizedMail\('food',.*recipientLanguage\(email\)/);
  assert.match(email, /localizedMail\('meal',.*recipientLanguage\(email\)/);
});

test('actual email entrypoints select recipient preference and keep English mail intact', async () => {
  const source = readFileSync(new URL('../server/email.js', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/export /g, '');
  const sent = [];
  let language = '"zh_Hans"';
  const db = { prepare(sql) {
    return {
      all() { assert.match(sql, /key LIKE/); return [{ key: 'smtp_host', value: 'smtp.invalid' }]; },
      get() {
        if (sql.includes('FROM users')) return { id: 7 };
        assert.match(sql, /key = 'language' AND deleted_at IS NULL/);
        return { value: language };
      },
    };
  } };
  const nodemailer = { createTransport() { return { async sendMail(mail) { sent.push(mail); } }; } };
  const api = new Function('nodemailer', 'db', 'logger', 'userLanguage', 'chineseEmail', `${source}\nreturn { sendPasswordReset, sendInvite, sendFoodShared, sendMealShared, testSmtp };`)(nodemailer, db, {}, userLanguage, chineseEmail);
  const url = 'https://example.test/#/action?token=sample';
  await api.sendPasswordReset('user@example.test', url);
  assert.equal(sent.at(-1).subject, '重置您的 NutriAgent 密码');
  assert.match(sent.at(-1).html, /<html lang="zh-CN">/);
  assert.doesNotMatch(sent.at(-1).html, /Self-hosted|Your data, your rules|Your AI Nutrition Assistant/);
  await api.sendFoodShared('user@example.test', 'English food name', 'English sender', url);
  assert.match(sent.at(-1).text, /English food name/);
  await api.sendMealShared('user@example.test', '<Meal>', '<Sender>', url);
  assert.match(sent.at(-1).html, /&lt;Meal&gt;/);
  assert.doesNotMatch(sent.at(-1).html, /<Meal>|<Sender>/);
  await api.sendInvite('new@example.test', url, '<Admin>', 'zh-CN');
  assert.equal(sent.at(-1).subject, '邀请您加入 NutriAgent');
  await api.testSmtp({ to: 'admin@example.test', origin: 'https://example.test', language: 'zh-CN' });
  assert.equal(sent.at(-1).subject, 'SMTP 测试成功');
  language = '"en"';
  await api.sendPasswordReset('user@example.test', url);
  assert.equal(sent.at(-1).subject, 'Reset your NutriAgent password');
  assert.equal(sent.at(-1).text, `Reset your NutriAgent password:\n${url}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`);
  assert.match(sent.at(-1).html, /<html lang="en">/);
  assert.doesNotMatch(sent.at(-1).html, /[\u4e00-\u9fff]/);
});
