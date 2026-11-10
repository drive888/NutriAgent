# NutriAgent 项目更名

日期：2026-11-10。用户授权将整个本地项目改为 NutriAgent，包括代码和目录名称。

## 当前入口与目录

- 项目：`/Users/leo/Documents/ChatGPT/团队项目/NutriAgent`
- 本地运行与数据：`/Users/leo/Documents/ChatGPT/团队项目/NutriAgent-local`
- 主预览：<http://localhost:3103/>，容器 `nutriagent-preview`
- 保留的旧版实例：3101，容器 `nutriagent-local`；沿用其原服务器镜像和数据，仅修正名称、挂载及前端资源路径。
- Compose：在 `NutriAgent-local` 中执行 `docker compose -p nutriagent-local up -d --no-build`。运行镜像标签是本地的 `nutriagent-runtime:local`；项目仓库的 Dockerfile/Compose 可自行构建 `nutriagent:local`，未发布镜像。

## 更名范围

npm 根包与 API 包、锁文件、网页标题、PWA 名称、离线页、所有语言中的产品文案、后端邮件和通知、导出文件名、MCP 服务名称、Docker/CI 配置、文档和当前 Word 报告均同步更新。`NtApi` 系列代码标识改为 `NaApi`；助手组件改为 `NutriAgent.svelte`、`AgentFace.svelte`、`SettingsAgent.svelte`，对应测试和语言键更新。

Android 应用名称为 NutriAgent，标识为 `com.nutriagent.app`，Java/Kotlin 源目录和包声明一致，回调主协议为 `nutriagent://`；Capacitor Android 同步通过。本次未生成或安装 APK，也未验证真机升级。应用标识改变后，Android 会将其视作不同应用，旧安装的私有数据不会自动跨包迁移。

## 保留的兼容标识和来源记录

- IndexedDB 名称、原生 SQLite 名称、OAuth 加密盐、开发环境签名密钥及 `nt:` 持久化键保留，避免现有数据和会话失效。
- 新备份和 Webhook 使用 NutriAgent 名称，服务器仍识别旧备份前缀，并发送旧 Webhook 头别名。原生端保留旧 OAuth 回调协议和服务器 CORS 来源兼容。
- 用户自定义助手名保留；仅原默认 Buddy、FitBot、Trace 自动改为 NutriAgent。
- 真实上游仓库、翻译服务、Open Food Facts 服务账号、许可证与历史验收截图保持原身份。Git 历史及远程仓库没有改写或推送。
- 迁移前代码、容器配置及数据库副本保存在仅当前用户可访问的 `/tmp/nutriagent-rename-backup`。旧容器以 `*-before-rename` 名称停止保留；不会作为当前运行入口启动。

## 验证

- 品牌回归先确认三组旧名称断言失败，改名后四项全部通过，包含存储和加密兼容检查。
- 完整测试使用隔离源码和临时数据库在 Docker 中运行：954 项，909 通过、45 原有跳过、0 失败。
- 新项目目录中的生产构建、语言检查、Android 配置同步和 Compose 配置校验通过。当前 Word 报告 ZIP/全部 XML 有效，正文旧品牌已替换。
- 两个实例切换前后用户、食物、餐食及日记记录数相同；数据库、上传文件与环境配置保留，主预览数据从容器内部迁到持久本地目录。
- 用户实际 Edge 入口的原标题和缓存更新后，页面标题、关于页面、助手名与欢迎语均为 NutriAgent；Leo 原会话继续有效。恢复普通缓存并刷新后仍显示新名称。
- 使用新目录中的公开鸡翅样本完成真实识别，返回 chicken；未保存测试食物或日记。PWA manifest 的 name/short_name 均为 NutriAgent。

截图：[关于页面](rename-evidence/nutriagent-about.png)。
