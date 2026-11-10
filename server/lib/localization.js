/** User-facing server text only. Logs, protocol identifiers and stored data stay unchanged. */
export function normalizeLanguage(value) {
  if (typeof value !== 'string') return null;
  const tag = value.trim().replaceAll('_', '-').toLowerCase();
  if (['zh', 'zh-cn', 'zh-sg', 'zh-hans', 'zh-hans-cn'].includes(tag)) return 'zh-CN';
  if (tag === 'en' || tag.startsWith('en-')) return 'en';
  return null;
}

export function acceptLanguage(header) {
  if (typeof header !== 'string') return null;
  const choices = header.split(',').map((part, index) => {
    const [tag, ...params] = part.trim().split(';');
    const qParam = params.find(p => p.trim().startsWith('q='));
    const q = qParam ? Number(qParam.trim().slice(2)) : 1;
    return { language: normalizeLanguage(tag), q, index };
  }).filter(c => c.language && Number.isFinite(c.q) && c.q > 0 && c.q <= 1);
  choices.sort((a, b) => b.q - a.q || a.index - b.index);
  return choices[0]?.language || null;
}

export function userLanguage(db, userId) {
  if (userId == null) return 'en';
  const row = db.prepare("SELECT value FROM user_settings WHERE user_id = ? AND key = 'language' AND deleted_at IS NULL").get(userId);
  try { return normalizeLanguage(JSON.parse(row?.value || 'null')) || 'en'; } catch { return 'en'; }
}

export function requestLanguage(req, db) {
  return acceptLanguage(req.headers?.['accept-language']) || userLanguage(db, req.user?.id ?? req.apiUser?.id);
}

const MESSAGES = {
  'Origin not allowed. Server-to-server clients (Claude Desktop etc.) work by default; browser-based MCP inspectors must be listed in ALLOWED_ORIGINS.': '不允许此来源。服务器客户端（如 Claude Desktop）默认可用；浏览器中的 MCP 检查工具必须列在 ALLOWED_ORIGINS 中。',
  "Could not reach CookTrace": "无法连接 CookTrace",
  "Could not reach Mealie": "无法连接 Mealie",
  "Provider has no redirect_uris configured": "身份提供方尚未配置 redirect_uris",
  "Could not reach identity provider": "无法连接身份提供方",
  "Missing state": "缺少登录状态参数",
  "Invalid or expired state": "登录状态无效或已过期",
  "State / provider mismatch": "登录状态与身份提供方不匹配",
  "Unlink failed": "解除关联失败",
  "Discovery failed": "发现身份提供方配置失败",
  "issuer_url and client_id are required": "请提供 issuer_url 和 client_id",
  "At least one redirect_uri is required": "请至少提供一个 redirect_uri",
  "This provider is configured via environment variables and cannot be edited from the UI.": "此身份提供方已通过环境变量配置，无法在界面中修改。",
  "Invalid URL": "地址无效",
  "Only http and https URLs are allowed": "只允许使用 http 和 https 地址",
  "Could not resolve host": "无法解析主机地址",
  "Link-local / cloud-metadata addresses are not allowed": "不允许访问链路本地地址或云元数据地址",
  "Reply too large": "响应内容过大",
  "schedule must be one of: off, daily, weekly, monthly": "schedule 必须为 off、daily、weekly 或 monthly",
  "time must be HH:MM": "时间格式必须为 HH:MM",
  "time out of range": "时间超出有效范围",
  "retention must be 1-99": "保留份数必须在 1 到 99 之间",
  "OIDC provider returned no `sub` claim": "OIDC 身份提供方未返回 sub 声明",
  "No NutriAgent account is linked to this identity. Ask your admin to enable Auto-register new users on this provider, or have them invite you first.": "此身份尚未关联 NutriAgent 账号，请联系管理员启用该身份提供方的自动注册功能，或先邀请您加入。",
  "This provider identity is already linked to a different NutriAgent account.": "此身份已关联另一个 NutriAgent 账号。",
  "Cannot unlink your last sign-in method. Set a password first, or link another provider.": "无法移除最后一种登录方式，请先设置密码或关联其他身份提供方。",
  "Empty file": "文件为空",
  "Does not look like a LoseIt food log export — expected Date + Name + Type + Calories columns": "此文件不像 LoseIt 饮食日志导出文件，应包含 Date、Name、Type 和 Calories 列",
  "Missing required columns: need Date, a name (Name/Food/Item), and energy (Calories/kcal/Energy)": "缺少必需列：日期（Date）、名称（Name/Food/Item）和能量（Calories/kcal/Energy）",
  "This Daily Nutrition export has no Energy (kcal) column, so there are no numbers to import.": "此每日营养导出文件没有 Energy (kcal) 列，没有可导入的数值。",
  "This Food & Recipe Entries export lists your foods but has no nutrition columns, which is how Cronometer now exports it on some accounts. Use Export Daily Nutrition instead, with \"Include diary group rows\" ticked, to bring your totals per meal.": "此食物与食谱导出文件列出了食物，但没有营养列，部分 Cronometer 账号会采用这种导出方式。请改用 Export Daily Nutrition，并勾选 Include diary group rows，以导入各餐次的营养汇总。",
  "No meal-nutrition CSV found in the ZIP — expected a file named \"Nutritional Information.csv\" or \"Meal Level Nutrition Details.csv\"": "ZIP 中未找到餐次营养 CSV，应包含 Nutritional Information.csv 或 Meal Level Nutrition Details.csv 文件",
  "ZIP uploads are only supported for MyFitnessPal — please extract the CSV first": "只有 MyFitnessPal 支持 ZIP 上传，请先解压出 CSV 文件",
  "SMTP test failed": "SMTP 测试失败",
  "Not found": "未找到",
  "Forbidden": "无权访问",
  "Unauthorized": "未授权",
  "Not authenticated": "请先登录",
  "Not logged in": "请先登录",
  "Admin only": "仅管理员可操作",
  "Not configured": "尚未配置",
  "Setup required": "请先完成初始设置",
  "Name required": "请填写名称",
  "name required": "请填写名称",
  "Already yours": "已经属于您",
  "Invalid token": "令牌无效",
  "Token required": "请提供令牌",
  "Token is required": "请提供令牌",
  "Rate limited": "请求过于频繁",
  "Invalid CSRF token": "安全校验失败，请刷新页面后重试",
  "Request body too large": "请求内容过大",
  "Internal server error": "服务器内部错误",
  "A fast is already in progress. End it before starting a new one.": "已有正在进行的禁食，请先结束再开始新的禁食。",
  "Fast not found": "未找到禁食记录",
  "Fast is already ended": "禁食已经结束",
  "AI is configured via environment variables and cannot be changed here.": "AI 已通过环境变量配置，无法在此修改。",
  "AI not configured on server. Set AI_API_KEY in environment.": "服务器尚未配置 AI，请设置环境变量 AI_API_KEY。",
  "AI_PROVIDER=oai-compat requires AI_BASE_URL in environment.": "AI_PROVIDER=oai-compat 需要设置环境变量 AI_BASE_URL。",
  "AI_PROVIDER=oai-compat requires AI_MODEL in environment.": "AI_PROVIDER=oai-compat 需要设置环境变量 AI_MODEL。",
  "API tokens require a signed-in account. Enable user management and sign in as an admin first.": "API 令牌需要已登录的账号，请先启用用户管理并以管理员身份登录。",
  "Webhooks require a signed-in account. Enable user management and sign in as an admin first.": "Webhook 需要已登录的账号，请先启用用户管理并以管理员身份登录。",
  "An account with this email already exists. Sign in instead.": "此邮箱已有账号，请直接登录。",
  "Apprise URL required": "请填写 Apprise 地址",
  "Cannot change your own role": "无法修改自己的角色",
  "Cannot delete the only admin account.": "无法删除唯一的管理员账号。",
  "Cannot delete the only admin account. Transfer admin to another user first.": "无法删除唯一的管理员账号，请先将管理员权限转交给其他用户。",
  "Cannot delete yourself": "无法删除自己的账号",
  "Cannot demote the only admin. Promote another user to admin first.": "无法移除唯一管理员的权限，请先将其他用户设为管理员。",
  "CookTrace URL must match the one saved in Settings.": "CookTrace 地址必须与设置中保存的一致。",
  "CookTrace request failed": "CookTrace 请求失败",
  "CookTrace returned non-JSON response": "CookTrace 返回的响应不是 JSON",
  "Could not reach that service": "无法连接到该服务",
  "Current password is incorrect": "当前密码不正确",
  "Current password required": "请填写当前密码",
  "Domain not allowed": "不允许访问此域名",
  "File is not a supported image (JPEG, PNG, WebP, GIF, HEIC, AVIF, BMP).": "图片格式不受支持（支持 JPEG、PNG、WebP、GIF、HEIC、AVIF、BMP）。",
  "Fitbit client_id and redirect_uri must be configured in Settings → Wellness.": "请先在“设置 → 健康”中配置 Fitbit 的 client_id 和 redirect_uri。",
  "Garmin consumer key, secret, and redirect URI must be configured in Settings → Wellness.": "请先在“设置 → 健康”中配置 Garmin 的 consumer key、secret 和 redirect URI。",
  "Google Health client_id and redirect_uri must be configured in Settings → Wellness.": "请先在“设置 → 健康”中配置 Google Health 的 client_id 和 redirect_uri。",
  "Withings client_id and redirect_uri must be configured in Settings → Wellness.": "请先在“设置 → 健康”中配置 Withings 的 client_id 和 redirect_uri。",
  "GitHub API unreachable and no cached version.": "无法连接 GitHub API，且没有缓存的版本信息。",
  "Google Health not configured": "尚未配置 Google Health",
  "Gotify URL and token required — save settings first": "请先填写并保存 Gotify 地址和令牌",
  "Image bytes do not match a supported type": "图片内容与受支持的格式不符",
  "Image missing or too large": "图片缺失或过大",
  "Invalid date range": "日期范围无效",
  "Invalid or already used invite link": "邀请链接无效或已被使用",
  "Invalid or expired link": "链接无效或已过期",
  "Invalid or expired reset link": "重置链接无效或已过期",
  "Invalid recovery token.": "恢复令牌无效。",
  "Invalid role": "角色无效",
  "Invalid username or password": "用户名或密码不正确",
  "Invalid visibility": "可见范围无效",
  "Invite link has expired": "邀请链接已过期",
  "Invite not found": "未找到邀请",
  "Local OFF mirror has no answer; remote disabled (OFF_LOCAL_ONLY)": "本地 OFF 镜像中没有结果，远程查询已禁用（OFF_LOCAL_ONLY）",
  "MCP not enabled on this server": "此服务器未启用 MCP",
  "Mealie URL must match the one saved in Settings.": "Mealie 地址必须与设置中保存的一致。",
  "New password required": "请填写新密码",
  "No CookTrace URL configured. Set it in Settings > Connected Services first.": "尚未配置 CookTrace 地址，请先前往“设置 → 已连接的服务”设置。",
  "No Mealie URL configured. Set it in Settings → Connected Services first.": "尚未配置 Mealie 地址，请先前往“设置 → 已连接的服务”设置。",
  "No file uploaded": "未上传文件",
  "No oauth_token in Garmin response": "Garmin 响应中缺少 oauth_token",
  "No rows found in file": "文件中没有找到数据行",
  "Not a CookTrace request this app makes": "此应用不支持该 CookTrace 请求",
  "Not a Mealie request this app makes": "此应用不支持该 Mealie 请求",
  "OFF_LOCAL_DB is not set; nothing to refresh.": "未设置 OFF_LOCAL_DB，没有可刷新的内容。",
  "Password login is disabled. Use Single Sign-On instead.": "密码登录已禁用，请使用单点登录。",
  "Protocol not allowed": "不允许使用此协议",
  "Provide { date } or { from, to }": "请提供 { date } 或 { from, to }",
  "Provider not found": "未找到身份提供方",
  "Public API not enabled on this server": "此服务器未启用公共 API",
  "Public API writes not enabled on this server": "此服务器未启用公共 API 写入功能",
  "Range cannot exceed 365 days": "日期范围不能超过 365 天",
  "Recovery not available. Set RECOVERY_TOKEN environment variable.": "恢复功能不可用，请设置环境变量 RECOVERY_TOKEN。",
  "Reset link has expired": "重置链接已过期",
  "SMTP is configured via environment variables and cannot be changed here.": "SMTP 已通过环境变量配置，无法在此修改。",
  "Sharing is not enabled on this instance.": "此实例未启用共享功能。",
  "Sharing is not enabled.": "尚未启用共享功能。",
  "Sign-in expired. Please try again.": "登录已过期，请重试。",
  "That address is not an image": "该地址的内容不是图片",
  "The app's address is unknown. Set PUBLIC_URL, then try again.": "无法确定应用地址，请设置 PUBLIC_URL 后重试。",
  "This setting is locked by the OIDC_ENABLE_EMAIL_PASSWORD_LOGIN environment variable and cannot be changed from the admin UI.": "此设置由环境变量 OIDC_ENABLE_EMAIL_PASSWORD_LOGIN 锁定，无法在管理界面修改。",
  "Token and password required": "请提供令牌和密码",
  "Token, username and password required": "请提供令牌、用户名和密码",
  "Too many login attempts for this account. Try again later.": "此账号的登录尝试过于频繁，请稍后再试。",
  "Too many login attempts. Try again in a few minutes.": "登录尝试过于频繁，请几分钟后再试。",
  "Unknown config key": "未知配置项",
  "Unknown recognition kind": "未知识别类型",
  "Recognition timed out": "识别超时",
  "Recognition service not configured": "尚未配置识别服务",
  "Recognition result invalid or service failed": "识别结果无效或识别服务失败",
  "Unknown token type": "未知令牌类型",
  "Unsupported source": "不支持此数据来源",
  "Update checks are turned off by UPDATE_CHECK in the environment": "更新检查已由环境变量 UPDATE_CHECK 禁用",
  "User not found": "未找到用户",
  "Username and password required": "请填写用户名和密码",
  "Workout not found": "未找到运动记录",
  "You are already signed in. Use Settings to disable user management.": "您已登录，请在设置中禁用用户管理。",
  "baseUrl, token and path required": "请提供 baseUrl、token 和 path",
  "calories_burned must be a number 0..10000": "calories_burned 必须是 0 到 10000 之间的数字",
  "date must be YYYY-MM-DD": "日期格式必须为 YYYY-MM-DD",
  "date required": "请提供日期",
  "duration_min must be 0..1440": "duration_min 必须在 0 到 1440 之间",
  "external_id required for idempotency": "请提供 external_id 以保证幂等性",
  "forbidden key": "不允许修改此设置项",
  "from and to required (YYYY-MM-DD)": "请提供开始和结束日期（YYYY-MM-DD）",
  "invalid date": "日期无效",
  "invalid key format": "设置项格式无效",
  "kcal must be a number 0..10000": "kcal 必须是 0 到 10000 之间的数字",
  "key required": "请提供设置项名称",
  "measured_at must be ISO 8601": "measured_at 必须符合 ISO 8601 格式",
  "measured_at required": "请提供 measured_at",
  "messages array required": "请提供 messages 数组",
  "metric query param required": "请提供 metric 查询参数",
  "name and date required": "请提供名称和日期",
  "no measurement fields provided": "未提供测量字段",
  "ntfy topic required": "请填写 ntfy 主题",
  "role and content required": "请提供 role 和 content",
  "settings object required": "请提供 settings 对象",
  "slot must be an integer in [0, 31]": "slot 必须是 0 到 31 之间的整数",
  "token and type required": "请提供 token 和 type",
  "url required": "请提供地址",
  "visibility must be private, group, or specific": "visibility 必须为 private、group 或 specific",
  "Food name must not be blank": "食物名称不能为空",
  "Portion must be a positive number": "份量必须是正数",
  "Nutrition must be an object": "营养信息必须是对象",
  "Invalid diary date": "日记日期无效",
  "Diary items must be an array": "日记条目必须是数组",
  "Invalid diary item": "日记条目无效",
  "Quantity must be a positive number": "数量必须是正数",
  "Password must be at least 8 characters": "密码至少需要 8 个字符",
  "Password must include a lowercase letter": "密码必须包含小写字母",
  "Password must include an uppercase letter": "密码必须包含大写字母",
  "Password must include a number": "密码必须包含数字",
  "Password must include a special character": "密码必须包含特殊字符",
  "Email not configured. Ask your admin to set up SMTP in Settings.": "尚未配置邮件，请联系管理员在设置中配置 SMTP。",
  "No recipient. Fill in a From address (or make sure your account has an email set).": "没有收件人，请填写发件地址或为账号设置邮箱。",
  "At least one valid scope required": "请至少选择一个有效权限范围",
  "At least one valid event required": "请至少选择一个有效事件",
  "Webhook not found": "未找到 Webhook",
  "Test notification — connected!": "测试通知——连接成功！",
};

const PATTERNS = [
  [/^Upstream (\d+)$/, status => `上游服务返回状态 ${status}`],
  [/^Garmin request token failed: (.*)$/, detail => `Garmin 请求令牌失败：${detail}`],
  [/^Google Health TCX fetch failed: (\d+)(.*)$/, (status, detail) => `Google Health TCX 获取失败：${status}${detail}`],
  [/^Fitbit TCX fetch failed: (\d+)$/, status => `Fitbit TCX 获取失败：${status}`],
  [/^Token lacks any of (.+)$/, scopes => `令牌未包含以下任一权限：${scopes}`],
  [/^(gotify|ntfy|apprise): (.+)$/, (service, detail) => `${service}：${translateServerText(detail, 'zh-CN')}`],
  [/^An account with that email already exists \(username: (.+)\)\. They can sign in directly or use Forgot Password\.$/, name => `此邮箱已有账号（用户名：${name}），可以直接登录或使用“忘记密码”。`],
  [/^Your (.+) account matches an existing NutriAgent user\. Sign in the usual way once, then link this provider from Profile → Linked Accounts\. After that, SSO will sign you in directly\.$/, provider => `您的 ${provider} 账号与已有 NutriAgent 用户匹配。请先通过原有方式登录，然后在“个人资料 → 关联账号”中关联此身份提供方，之后即可通过单点登录直接进入。`],
  [/^Unknown OIDC provider (.+)$/, id => `未知 OIDC 身份提供方 ${id}`],
  [/^OIDC provider (.+) is disabled$/, id => `OIDC 身份提供方 ${id} 已禁用`],
  [/^([a-z_]+) must be a number$/, key => `${key} 必须是数字`],
  [/^([a-z_]+) out of range \((.+)\)$/, (key, range) => `${key} 超出有效范围（${range}）`],
  [/^Private \/ loopback addresses are blocked\. Set (.+)=1 to enable LAN targets\.$/, key => `私有地址和回环地址已被禁用，请设置 ${key}=1 以允许局域网目标。`],
  [/^Backup contains too many image entries \(>(\d+)\)$/, n => `备份包含的图片条目过多（超过 ${n} 条）`],
  [/^Refusing unsafe path in backup: (.+)$/, path => `已拒绝备份中的不安全路径：${path}`],
  [/^Refusing path traversal in backup: (.+)$/, path => `已拒绝备份中的路径穿越：${path}`],
  [/^Backup uncompressed size exceeds (\d+) bytes \(zip-bomb defense\)$/, n => `备份解压后的大小超过 ${n} 字节（压缩炸弹防护）`],
  [/^Invalid OFF refresh interval: (.+)\. Use off\|daily\|weekly\|monthly\.$/, value => `OFF 刷新间隔 ${value} 无效，请使用 off、daily、weekly 或 monthly。`],
  [/^Does not look like a MyFitnessPal export — expected Date \+ Meal \+ Calories columns, got: (.+)$/, columns => `此文件不像 MyFitnessPal 导出文件，应包含 Date、Meal 和 Calories 列，实际列为：${columns}`],
  [/^This doesn't look like a Cronometer export\. Expected either Day and Food Name columns \(Export Food & Recipe Entries\) or a Date column with nutrients \(Export Daily Nutrition\), but found: (.+)\.$/, columns => `此文件不像 Cronometer 导出文件，应包含 Day 和 Food Name 列（Export Food & Recipe Entries），或 Date 和营养素列（Export Daily Nutrition），实际列为：${columns}。`],
  [/^(Parse failed|Import failed|Could not read ZIP|Token unavailable): (.+)$/, (kind, detail) => `${({ 'Parse failed': '解析失败', 'Import failed': '导入失败', 'Could not read ZIP': '无法读取 ZIP', 'Token unavailable': '令牌不可用' })[kind]}：${translateServerText(detail, 'zh-CN')}`],

  [/^Too many requests\. Try again in (\d+)s\.$/, n => `请求过于频繁，请在 ${n} 秒后重试。`],
  [/^Invalid nutrient (.+)$/, key => `营养素 ${key} 无效`],
  [/^Too many messages \(max (\d+)\)$/, n => `消息过多（最多 ${n} 条）`],
  [/^Payload too large \((\d+) bytes; max (\d+)\)$/, (n, max) => `请求内容过大（${n} 字节；最多 ${max} 字节）`],
  [/^Unknown (service|provider): (.+)$/, (kind, value) => `未知${kind === 'service' ? '服务' : '提供方'}：${value}`],
  [/^(CookTrace|Mealie) returned (\d+)$/, (service, status) => `${service} 返回状态 ${status}`],
  [/^Token lacks (.+)$/, scope => `令牌缺少权限 ${scope}`],
  [/^Password is too weak: (.*)$/, () => '密码强度不足，请使用更长且难以猜测的密码。'],
];

export function translateServerText(message, language) {
  if (normalizeLanguage(language) !== 'zh-CN' || typeof message !== 'string') return message;
  if (Object.hasOwn(MESSAGES, message)) return MESSAGES[message];
  for (const [pattern, render] of PATTERNS) {
    const match = message.match(pattern);
    if (match) return render(...match.slice(1));
  }
  return message; // External errors and protocol identifiers are never guessed.
}

export function localizeJsonErrors(db) {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function (body) {
      if (this.statusCode >= 400 && typeof body === 'string') body = translateServerText(body, requestLanguage(req, db));
      return originalSend.call(this, body);
    };
    const original = res.json;
    res.json = function (body) {
      // OAuth/MCP error fields are protocol identifiers rather than display text.
      if (body && !Array.isArray(body) && typeof body.error === 'string') {
        const translated = translateServerText(body.error, requestLanguage(req, db));
        if (translated !== body.error) body = { ...body, error: translated };
      }
      return original.call(this, body);
    };
    next();
  };
}

const NOTIFICATIONS = {
  '🛟 NutriAgent backup failed': '🛟 NutriAgent 备份失败',
  'Time to log your meal!': '该记录您的餐食了！',
  '⚠️ Wellness Alert': '⚠️ 健康提醒',
  '🏋️ Workout Complete': '🏋️ 运动已完成',
  '🔄 Sync Issue': '🔄 同步问题',
  '👟 Step Goal Reached!': '👟 已达成步数目标！',
  '🚶 Step Goal Progress': '🚶 步数目标进度',
  '📊 Weekly Summary': '📊 每周摘要',
  '💧 Hydration Reminder': '💧 饮水提醒',
  'Time to drink some water! Stay hydrated.': '该喝水了，记得及时补充水分。',
  '🍽️ Meal Reminder': '🍽️ 用餐记录提醒',
  '⚖️ Weigh-in Reminder': '⚖️ 称重提醒',
  'Time to step on the scale!': '该称一下体重了！',
  '🌙 Bedtime Reminder': '🌙 就寝提醒',
  '🌙 Wind Down': '🌙 睡前放松',
};
const NOTIFICATION_PATTERNS = [
  [/^Scheduled backup error: (.+)$/, detail => `定时备份失败：${detail === 'unknown' ? '未知错误' : translateServerText(detail, 'zh-CN')}`],
  [/^(.+): (\d+) min(.*)$/, (name, min, details) => `${name}：${min} 分钟${details}`],
  [/^Time to log your (.+)!$/, name => `该记录您的${name}了！`],
  [/^([\d,.]+) steps — goal was ([\d,.]+)!$/, (steps, goal) => `已走 ${steps} 步，目标为 ${goal} 步！`],
  [/^([\d,.]+) steps so far — ([\d,.]+) to go!$/, (steps, left) => `已走 ${steps} 步，还差 ${left} 步！`],
  [/^Aim for ([\d.]+)h tonight — time to wind down\.$/, h => `今晚争取睡够 ${h} 小时，该放松准备休息了。`],
  [/^You slept ([\d.]+)h last night — prioritize an earlier bedtime tonight\.$/, h => `昨晚睡了 ${h} 小时，今晚尽量早点休息。`],
  [/^Great ([\d.]+)h last night — keep it up with another ([\d.]+)h tonight\.$/, (last, goal) => `昨晚睡了 ${last} 小时，做得很好！今晚继续争取睡够 ${goal} 小时。`],
  [/^Bedtime in (\d+) min — start winding down\. (.+)$/, (min, rest) => `${min} 分钟后就寝，请开始放松。${translateNotification(rest, 'zh-CN')}`],
  [/^Scheduled (\w+) sync failed: (.+)$/, (service, detail) => `${service} 定时同步失败：${translateServerText(detail, 'zh-CN')}`],
  [/^Fitbit sync failed for (.+): (.+)$/, (day, detail) => `${day} 的 Fitbit 同步失败：${translateServerText(detail, 'zh-CN')}`],
  [/^Avg steps: (.+)$/, value => `平均步数：${value}`],
  [/^Avg (?:energy|cal) burned: (.+)$/, value => `平均消耗能量：${value}`],
  [/^Avg sleep: (\d+)h (\d+)m$/, (h, min) => `平均睡眠：${h} 小时 ${min} 分钟`],
  [/^Marked complete: (\d+) of 7 days$/, done => `已标记完成：${done} / 7 天`],
  [/^HRV dropped to ([\d.]+)ms \(7-day avg: ([\d.]+)ms\)\. Consider extra rest today\.$/, (value, avg) => `HRV 降至 ${value} ms（7 天平均值：${avg} ms），今天可适当增加休息。`],
  [/^Sleep score has declined 3 days in a row \((.+)\)\. Prioritize sleep tonight\.$/, values => `睡眠评分已连续下降 3 天（${values}），今晚请优先保证睡眠。`],
  [/^Resting HR elevated at (\d+) bpm \(7-day avg: (\d+) bpm\)\. Could indicate stress, illness, or poor recovery\.$/, (value, avg) => `静息心率升至 ${value} bpm（7 天平均值：${avg} bpm），可能与压力、疾病或恢复不佳有关。`],
];
export function translateNotification(message, language) {
  if (normalizeLanguage(language) !== 'zh-CN' || typeof message !== 'string') return message;
  if (Object.hasOwn(NOTIFICATIONS, message)) return NOTIFICATIONS[message];
  if (message.includes('\n')) return message.split('\n').map(line => translateNotification(line, language)).join('\n');
  for (const [pattern, render] of NOTIFICATION_PATTERNS) {
    const match = message.match(pattern);
    if (match) return render(...match.slice(1));
  }
  return message;
}
