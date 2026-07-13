# 敞亮人：当前应用运转逻辑

这份文档讲清楚"现在这个应用到底是怎么跑起来的"——从启动到你在界面上点一下按钮，中间实际发生了什么。所有描述都对应仓库里已经写好的真实代码，不是设计稿里的理想状态。

## 一句话概括

Tauri 桌面壳套一个 Vue3 前端，前端里跑两条独立链路：**Pull（问答）** 靠"本地语料 embedding 检索 + 调用 AI LAB 生成答案"；**Push（今日推送）** 靠"读结构化的培训计划/群聊摘要 + 调用 AI LAB 生成建议"。两条链路共享同一个对话模型调用方式，检索链路额外依赖一个独立的向量服务。

## 整体分层

```
┌─────────────────────────────────────────────────────┐
│ Tauri 桌面壳 (Rust, src-tauri/)                       │
│  - 注册插件：store / notification / shell / opener    │
│  - 没有自定义业务 command，只有脚手架自带的 greet()     │
│  - 所有业务逻辑都在 webview 里的 TS/Vue 跑              │
└─────────────────────────────────────────────────────┘
                        │ webview
┌─────────────────────────────────────────────────────┐
│ Vue3 前端 (src/)                                      │
│  App.vue —— 顶部 Tab 切换 + 设置入口                   │
│   ├── ChatView.vue   （Pull）                          │
│   ├── PushPanel.vue  （Push）                           │
│   └── SettingsDialog.vue（两套 API 凭据表单）           │
│                                                        │
│  lib/config.ts   —— 凭据读写（tauri-plugin-store）      │
│  lib/llm.ts      —— 对话 / 向量 两个外部 API 的封装      │
│  lib/retrieval.ts —— 语料分块 + embedding 缓存 + 检索    │
└─────────────────────────────────────────────────────┘
                        │ fetch()
┌───────────────────┐        ┌───────────────────────┐
│ AI LAB（公司中转站） │        │ 火山方舟 Ark            │
│ Anthropic Messages  │        │ 多模态向量接口           │
│ 格式，出对话          │        │ 出 embedding 向量        │
└───────────────────┘        └───────────────────────┘
```

关键点：**Rust 侧几乎不干活**。`src-tauri/src/lib.rs` 只是注册了几个官方插件（`tauri-plugin-store`、`tauri-plugin-notification`、`tauri-plugin-shell`、`tauri-plugin-opener`），没有自己写 Tauri command。所有"业务逻辑"——检索、拼 prompt、调用大模型——全部是前端 TypeScript 直接 `fetch()` 外部 HTTP 接口，Rust 只负责本地存储和系统通知这两件"桌面壳该干的事"。

## 两套外部凭据，两个不同厂商

这是最容易搞混的一点：**应用要调用两个完全独立的服务**，配置在 `⚙ 设置` 里分两组填（`SettingsDialog.vue`）：

| | 对话服务（AI LAB） | 向量服务（火山方舟） |
|---|---|---|
| 用途 | 生成问答/推送的文字内容 | 把文本变成向量，用于语义检索 |
| 接口格式 | Anthropic Messages（`/v1/messages`） | 火山方舟多模态向量（`/api/v3/embeddings/multimodal`） |
| 认证头 | `x-api-key` | `Authorization: Bearer` |
| 默认模型 | `claude-sonnet-4-5-20250929` | `doubao-embedding-vision-251215` |

两者互不影响，是因为公司 AI LAB 的中转站本身不提供向量模型，所以向量检索单独接了火山方舟。`lib/llm.ts` 里 `chatComplete()` 和 `embed()` 是两套完全不同的请求体/响应体解析逻辑（`llm.ts:23-57` vs `llm.ts:62-92`）。

**凭据存在哪：** `lib/config.ts` 用 `@tauri-apps/plugin-store` 把这六个字段写进本机的 `ai-lab-config.json`（macOS 上是 `~/Library/Application Support/com.admin.app/`），不写进代码仓库。有两个读取函数：
- `getConfig()`：四个必填字段（两个 baseUrl、两个 key）**全部**非空才返回配置，否则返回 `null`——`llm.ts` 用它来判断"能不能真的发起调用"。
- `getRawConfig()`：不做完整性校验，有什么返回什么——`SettingsDialog.vue` 用它回填表单，避免"漏填一项就把已存的其它项也显示成空白"。

## Pull（问答）完整链路

对应 `ChatView.vue` 的 `send()` 函数（`ChatView.vue:64-90`）：

1. 用户在输入框敲问题，点发送。
2. 调用 `search(question, 5)`（`retrieval.ts:160-167`）：
   a. **首次调用**时会触发 `buildIndex()`（`retrieval.ts:97-147`）——这是整个应用里唯一"重"的初始化步骤：
      - 拉 `public/knowledge/manifest.json`，里面列了 34 篇真实飞书文档的路径/标题/所属域/原始链接。
      - 逐个 `fetch` 每篇 Markdown 正文，按空行分段、每 ~450 字凑一个 chunk（`chunkMarkdown()`，`retrieval.ts:54-73`）。
      - 每个 chunk 先查 `localStorage` 里的 `openvision-embeddings-cache-v1`（`retrieval.ts:28,37-52`），命中且文本没变就直接复用向量；没命中的攒起来，每 20 个一批调用 `embed()` 去火山方舟拿向量，拿到后写回缓存。
      - 这一步做完，内存里就有了一份 `Chunk[]`（每个 chunk 带自己的向量），后续同一次应用运行内不会重复计算。
   b. 把问题本身也调一次 `embed()` 拿到 query 向量。
   c. 对索引里每个 chunk 算 cosine similarity（`retrieval.ts:75-85`），按分数降序取 top 5。
3. 用 `buildSystemPrompt()` + `buildUserPrompt()`（`ChatView.vue:46-62`）拼出请求：system prompt 规定"只能依据参考资料回答、不编造、不知道就说不知道"；user prompt 把 5 段检索结果按 `[资料N | 域 | 《标题》]` 格式塞进去，再附上原始问题。
4. 调用 `chatComplete()`（`llm.ts:23-57`）——真实 HTTP POST 到 AI LAB 的 `/v1/messages`，Anthropic 格式，拿到回答文本。
5. 回答展示在气泡里，来源用 `dedupeSources()`（`ChatView.vue:35-44`）去重后渲染成可点击的 chip（点击走 `tauri-plugin-opener` 的 `openUrl()` 在系统默认浏览器打开真实飞书链接）。
6. 任何一步出错（没配置凭据 / 网络失败 / API 报错）都会被 `try/catch` 兜住，把错误信息作为一条"错误气泡"展示出来，不会白屏。

## Push（今日推送）完整链路

对应 `PushPanel.vue` 的 `trigger()` 函数：

1. 用户点"生成今日建议"按钮（**当前是手动触发，不是真的定时任务**——这是明确的 MVP 简化，见下文"取舍"）。
2. 并行加载三份数据：
   - `loadTrainingPlan()` → `public/knowledge/personal/fly/plan.json`：fly 真实的新人培训计划，取 `current_focus`（当前阶段的任务列表 + 关联文档路径）。
   - `loadChatDigest()` → `public/knowledge/personal/fly/chat-digest.json`：群聊近期讨论的**摘要**（脱敏，不含发言人和原文，只有 `topic`/`summary`）。
   - `loadManifest()` → 复用 Pull 链路那份 `manifest.json`，用来把 `current_focus.related_docs` 里的路径转成标题/来源链接。
3. 对 `related_docs` 里每个文档路径 `fetch` 正文，截取前 600 字当摘录。
4. 拼 prompt：system prompt 要求"生成 2-3 条可执行建议，每条标来源，绝不提具体人名、绝不逐字引用群聊原文"；user prompt 把当前培训阶段、文档摘录、群聊摘要要点都塞进去。
5. 调用同一个 `chatComplete()` 生成建议文本，用 `parseSuggestions()` 按 `"- "` 开头切成一条条建议。
6. 调用 `tauri-plugin-notification` 的 `sendNotification()`（`notifyToday()`）——先检查/申请系统通知权限，弹一条真实的系统通知，标题固定"敞亮人 · 今日建议"，正文是第一条建议。
7. 面板内同步展示全部建议 + 来源 chip（文档来源可点击跳转，群聊来源只显示一个静态标签，不可点、不展示原文）。

## 知识语料从哪来

`public/knowledge/` 下的内容是**开发阶段用 lark-cli 一次性抓取好、脱敏处理后存进仓库的静态文件**，不是应用运行时实时连飞书拉取的：

```
public/knowledge/
├── manifest.json                    # 34 篇文档的索引（Pull 检索池）
├── company/*.md                     # 公司通用域：文化、HR/行政/财务/法务制度、AI LAB 指引（10 篇）
├── department/qqz/*.md              # 部门业务域：QQZ 智能客服产品/技术/需求/运维/分享（24 篇）
└── personal/fly/
    ├── plan.json                    # fly 的培训计划（Push 用）
    └── chat-digest.json             # 群聊摘要，脱敏（Push 用）
```

这意味着：Pull 回答的"知识"边界就是这 34 篇文档；Push 建议的"个人进度"就是 `plan.json` 里写死的那份计划。要更新知识范围，本质是重新走一遍 lark-cli 抓取流程、更新这些静态文件，而不是改代码。

## 当前已知的简化（不是 bug，是明确的取舍）

- **检索是内存态的**，没有接 LanceDB 之类的向量数据库；索引只存在于当前 webview 的一次运行内存 + `localStorage` 缓存里，关掉应用重开会重新走一遍 `buildIndex()`（但命中缓存的部分不会重新调用向量接口）。
- **Push 是手动按钮触发**，没有真正的每日定时后台任务或开机自启。
- **知识语料是离线快照**，不是实时连飞书。
- **群聊只在"摘要"层面参与**，原始发言人和原文从未进入代码仓库或 UI。

这些取舍在 `app/README.md` 的"关键取舍"一节也有记录，二者应保持一致。
