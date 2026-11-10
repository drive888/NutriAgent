import { normalizeLanguage } from './localization.js';

function escape(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Render only owned template text; names, titles and URLs are escaped, never translated. */
export function chineseEmail(type, data, language) {
  if (normalizeLanguage(language) !== 'zh-CN') return null;
  const name = data.name ? ` ${data.name}` : '';
  const intro = `您好${name}，`;
  let title, paragraphs = [], action = '', note = '';
  if (type === 'test') {
    title = 'SMTP 测试成功';
    paragraphs = ['这是一封来自您的 NutriAgent 实例的测试邮件。收到此邮件表示 SMTP 设置可以正常发送邮件。', '密码重置、用户邀请及其他事务邮件将通过此配置发送。'];
    note = '您可以放心删除此邮件。';
  } else if (type === 'reset') {
    title = '重置您的 NutriAgent 密码';
    paragraphs = ['我们收到了重置您 NutriAgent 账号密码的请求。请点击下方按钮设置新密码。'];
    action = '重置密码';
    note = '此链接将在 1 小时后失效。如果不是您发起的请求，请忽略此邮件。';
  } else if (type === 'invite') {
    title = '邀请您加入 NutriAgent';
    paragraphs = [`${data.sender || '管理员'} 邀请您加入 NutriAgent。您可以记录饮食、追踪营养目标和查看进度，数据保存在自己的服务器上。`];
    action = '接受邀请';
    note = '此邀请将在 7 天后失效。';
  } else if (type === 'food' || type === 'meal') {
    const kind = type === 'food' ? '食物' : '餐食';
    title = `有人与您分享了${kind}`;
    paragraphs = [`${data.sender || '有人'} 在 NutriAgent 上与您分享了“${data.item || (type === 'food' ? '食物' : '餐食')}”。`, '请在“来自他人”中查看详情、记录到日记，或复制到自己的资料库。'];
    action = `查看${kind}`;
  } else if (type === 'weekly') {
    title = `NutriAgent 每周摘要 — ${data.weekRange}`;
    paragraphs = [data.weekRange, ...data.rows.filter(row => row[1] != null).map(([label, value, unit]) => `${label}：${value}${unit ? ' ' + unit : ''}`)];
    note = '如需停止接收此邮件，请在“设置 → 通知”中关闭每周摘要。';
  } else return null;
  const linkText = data.url ? `${action}：${data.url}` : '';
  const body = `<p>${escape(intro)}</p><h2 class="nt-heading" style="color:#FFFFFF">${escape(title)}</h2>` +
    paragraphs.map(p => `<p class="nt-body-txt" style="color:#8A93A8;line-height:1.7">${escape(p)}</p>`).join('') +
    (data.url ? `<p><a style="color:#00C47A" href="${escape(data.url)}">${escape(action)}</a></p><p class="nt-expiry" style="color:#8A93A8">按钮无法使用？请将此链接复制到浏览器：<br><a style="color:#00C47A;word-break:break-all" href="${escape(data.url)}">${escape(data.url)}</a></p>` : '') +
    (note ? `<p class="nt-expiry" style="color:#8A93A8">${escape(note)}</p>` : '');
  return { subject: title, body, preheader: escape(title), text: [intro, title, ...paragraphs, linkText, note].filter(Boolean).join('\n\n') };
}
