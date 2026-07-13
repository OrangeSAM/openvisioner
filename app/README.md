# 敞亮人 (OpenVision Companion) — 桌面端原型

Tauri + Vue 3 桌面应用，新员工入职导航 AI Agent。真实调用公司 AI LAB 的 Claude 代理，检索预先抓取的真实飞书语料（Wiki/文档/表格/群聊摘要），支持 **Pull（问答）** 和 **Push（主动推送）** 两种交互模式。

## 功能

- **问答（Pull）**：输入问题 → 本地 embedding 检索相关语料 → 调用 AI LAB 生成回答，回答下方展示可点击的来源卡片（跳转真实飞书链接）。
- **今日推送（Push）**：点击"模拟触发今日推送" → 结合个人培训计划、相关需求/技术文档、群内近期讨论摘要生成 2-3 条今日建议 → 弹出系统通知，面板内同步展示带来源的建议卡片。群聊内容**只输出摘要**，不逐字引用、不点名。

## 快速开始

### 环境要求

- Node.js（已装依赖见 `package.json`）
- Rust 工具链（`rustup`/`cargo`），首次运行前确认 `cargo --version` 可用

### 安装 & 运行

```bash
npm install
npm run tauri dev
```

首次启动后，需要在应用右上角 **⚙ 设置** 里分别填写两套凭据，保存后才能正常问答和推送：
- **对话服务（AI LAB）**：Base URL / API Key / 对话模型。走 Anthropic Messages API 格式（`/v1/messages`，`x-api-key` 认证）。
- **向量服务（火山方舟）**：Base URL（默认 `https://ark.cn-beijing.volces.com`）/ API Key / 向量模型（默认 `doubao-embedding-vision-251215`）。走火山方舟多模态向量接口（`/api/v3/embeddings/multimodal`，`Authorization: Bearer` 认证），请求/响应格式与 OpenAI 的 `/v1/embeddings` 不同（`input` 为带类型的对象数组，一次调用返回一个融合向量，响应体 `data` 是对象而非数组）。

两个服务厂商/账号相互独立，配置只保存在本机 `tauri-plugin-store`（app data dir），**不会写入仓库**。

### 其他脚本

```bash
npm run dev       # 仅启动 Vite（前端调试，不含 Tauri 壳）
npm run build     # 类型检查 + 生产构建
npm run tauri build  # 打包桌面应用（当前 demo 范围未验证打包分发）
```

## 项目结构

```
app/
├── src/
│   ├── App.vue                 # 应用外壳：问答/今日推送 Tab + 设置入口
│   ├── components/
│   │   ├── ChatView.vue        # Pull 模式 UI
│   │   ├── PushPanel.vue       # Push 模式 UI + 系统通知
│   │   └── SettingsDialog.vue  # AI LAB + 向量服务 配置表单
│   └── lib/
│       ├── config.ts           # 两套服务凭据读写（tauri-plugin-store）
│       ├── llm.ts              # AI LAB chat completions（Anthropic 格式） / 火山方舟多模态向量接口 封装
│       └── retrieval.ts        # 语料分块、embedding 缓存、余弦相似度检索
├── src-tauri/                  # Rust 侧 Tauri 壳（notification/store/shell/opener 插件）
└── public/knowledge/           # 离线预抓取的真实语料（见下）
    ├── manifest.json           # 语料索引（标题/域/来源链接），共 37 篇
    ├── company/*.md            # 公司通用域：企业文化、HR/行政/财务/法务制度、AI LAB 指引、培训材料（13 篇）
    ├── department/qqz/*.md     # 部门业务域：QQZ 智能客服产品/技术/需求/运维/内部分享（24 篇）
    └── personal/fly/
        ├── plan.json           # fly 的真实新人培训计划（结构化）
        └── chat-digest.json    # 群聊摘要（脱敏，无发言人/无逐字引用）
```

## 关键取舍

- **对话与向量服务是两个独立厂商**：公司 AI LAB 的中转站不提供向量模型，因此对话（AI LAB / Claude 代理）和向量检索（火山方舟 `doubao-embedding-vision-251215`）分别配置、分别调用，互不影响；两者的 API 格式也不同（Anthropic Messages vs. 火山多模态向量），已在设置表单和 `llm.ts` 中分别适配。
- **知识语料离线预抓取，检索和生成实时进行**：开发阶段用 lark-cli 一次性抓取真实飞书数据存入仓库，现场演示不做实时飞书拉取，避免网络/权限抖动影响演示；Pull/Push 的向量检索和 AI LAB 调用都是真实实时发生的。
- **本地内存态 embedding 检索**，未接入 LanceDB 等向量数据库（MVP 简化，后续工作）。
- **手动触发 Push**，未做真正的每日定时后台任务/开机自启（保留了一个演示性 `setInterval` 作为技术依据，但演示流程依赖手动按钮）。
- 群聊数据使用真实内容做检索上下文，但只输出摘要，原始消息不落盘到仓库、不在 UI 中展示。

## 验证 checklist

- [x] 向量服务（火山方舟 `doubao-embedding-vision-251215`）真实调用验证：设置里填入真实 Base URL/API Key 后请求返回 HTTP 200，正确解析出向量（响应体 `data` 为单个对象而非数组，已按此适配解析逻辑）
- [ ] 问部门业务问题（如"我们智能客服用的什么 IM 技术选型"），确认答案与 `department/qqz/*.md` 一致，来源链接可跳转真实飞书页面
- [ ] 问公司通用问题（如"入职培训计划怎么看"），确认走的是 `company/*.md` 语料
- [ ] 点击"模拟触发今日推送"，确认系统通知弹出 + 面板内建议卡片带来源，且不包含群聊原始发言人/原文
- [ ] 断网或清空 API Key 测试一次，确认有清晰的错误提示而非白屏
