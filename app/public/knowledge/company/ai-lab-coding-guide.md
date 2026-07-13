---
title: AI编程落地指引
source_url: https://openvision.sg.larksuite.com/wiki/Oo89dTLFKo6g1AxXqMalO9PwgNd
---

# AI 编程落地指引

## 0. 开始之前

- AI 编程落地的首要任务是建立**共同认知**，避免在基础未稳时直接推进组织级系统改造。
- AI 编程的起点应是**项目级任务单元**（需求/模块/里程碑），不是方法级或文件级零散对话。
- 代码补全是局部能力，不是 AI 编程主流程；主流程是“任务编排 + 执行验证 + 证据沉淀”。
- 先把“能用、好用、少出错”的项目级闭环跑通，再逐步升级治理深度。
- 在项目级交付场景中，**Claude Code** 和 **Codex** 更适合作为主执行面；Cursor、Copilot、Trae 可作为补充入口。
- 选型先看“是否降低日常出错与返工”，再看“高级治理能力”。

## 1. 什么是 AI 编程

AI 编程是把模型能力嵌入工程交付链路，让 AI 参与从需求到交付的关键环节，并对结果负责。默认工作单位是项目任务，不是单个函数片段。

### 1.1 关键定义

AI 编程至少包含五类动作：

1. 任务理解：读取需求、约束、现有代码和历史决策。
2. 方案生成：给出实现路径、风险点、替代方案。
3. 执行落地：读写代码、运行命令、修复问题。
4. 质量验证：测试、审查、回归、边界检查。
5. 资产沉淀：记录结论、更新规则、复用到下一轮。

### 1.2 边界澄清

AI 编程不等于以下三件事：

1. 不等于代码补全：补全只解决“当前行怎么写”，不解决“项目任务怎么收口”。
2. 不等于单次生成：单次生成缺少验证链路，无法保证可交付。
3. 不等于模型问答：问答给结论，工程需要证据、验证和回滚机制。

### 1.3 项目级任务单元

项目级任务单元通常具备完整输入和可验收输出：

| 项目级任务要素 | 典型内容 |
|-|-|
| 输入 | 需求边界、架构约束、代码上下文、依赖条件 |
| 过程 | 方案拆解、实现、测试、风险审查 |
| 输出 | 可运行改动、测试结果、审查结论、提交说明 |
| 证据 | 命令记录、日志、diff、评审意见、回归结果 |

### 1.4 最小闭环（项目主线）

1. 明确目标与边界（做什么、不做什么）。
2. 拆解任务与执行顺序（先后依赖、并行机会）。
3. 执行改动与验证（读、改、测、审）。
4. 记录证据（日志、测试、变更说明）。
5. 回流迭代（把失败样本转化为规则、skill、检查项）。

### 1.5 成熟度分级（用于自测）

1. L0：仅补全/问答，结果不可复用。
2. L1：能完成单任务实现，但验证和记录不稳定。
3. L2：形成项目级闭环，质量门禁可执行。
4. L3：形成可迭代 AI-SOP 资产库，跨项目可迁移。

## 2. API、MCP、Skills、Agents、AI CLI 的关系

它们是同一系统里的并行能力组件，不是替代关系。项目级交付时，需要同时覆盖“推理、连接、操作、编排、执行”。

### 2.0 概念导入（通俗定义）

可将其对应为项目团队中的五类职能角色：

1. API：像“大脑”，负责理解和生成。
2. MCP：像“外接线”，负责连到真实系统拿数据、调工具。
3. Skills：像“操作手册”，告诉系统同类任务怎么稳定完成。
4. Agents：像“调度员”，负责拆任务、排顺序、做协同。
5. AI CLI：像“工位现场”，真正进入仓库和终端把事做完。

可归纳为： 
`API 让它会想，MCP 让它能连，Skills 让它会做，Agents 让它会协同，AI CLI 让它能交付。`

### 2.1 组件职责与缺失风险

| 组件 | 核心职责 | 解决的问题 | 缺失时的典型后果 |
|-|-|-|-|
| API | 提供模型推理和生成能力 | 能不能思考与表达 | 只能人工完成分析与生成 |
| MCP | 连接外部系统与真实数据 | 能不能读到事实、调用工具 | 输出脱离真实环境，结论不可落地 |
| Skills | 固化操作级 SOP（可含脚本） | 能不能稳定复现做法 | 每次从零提示，质量波动大 |
| Agents | 任务拆解、协作与回流 | 能不能组织多阶段执行 | 长任务易断链，协作效率低 |
| AI CLI | 在仓库和终端执行任务链 | 能不能进入真实工程循环 | 停留在对话层，难形成交付证据 |

### 2.2 关系说明（并列 + 协同）

1. **MCP 与 Skills 是并列关系**： 
MCP提供“可调用能力”，Skills提供“可复用方法”。前者回答“能不能做”，后者回答“如何稳定做好”。
2. **Agents 是编排器**： 
将 Skills、MCP、API 组织成完整任务链，控制顺序、并行、回流。
3. **AI CLI 是执行现场**： 
把上面能力放入真实项目上下文（仓库、命令、日志、测试）。

### 2.3 典型调用路径（项目级）

1. 输入项目任务（需求/模块/里程碑）。
2. Agent 拆分阶段任务并选择对应 Skills。
3. 需要外部信息时通过 MCP 读取系统数据或调用工具。
4. 在 AI CLI 中执行改动、测试、审查与记录。
5. 将结果与失败样本回流为下一版规则或 skill。

### 2.4 四个运行平面（便于理解系统架构）

1. 推理平面：API 负责理解和生成。
2. 能力平面：MCP 与 Skills 提供“工具 + 方法”。
3. 编排平面：Agents 负责拆解、协同、回流。
4. 执行平面：AI CLI 负责在工程现场完成闭环。

可记成： 
`API(能思考) + MCP(能调用) + Skills(会做事) + Agents(会组织) + AI CLI(能交付)`

[图表：内容未导出]

### 2.5 这些组件为什么能改善问题（作用映射）

AI-SOP 的效果来自“组件分工 + 协同闭环”，不是单点能力增强。

1. API：提供推理与生成底座，解决“能不能理解任务”。
2. MCP：把真实系统状态引入执行链，解决“信息是否真实”。
3. Skills：把高频任务固化为可复用步骤，解决“做法是否稳定”。
4. Agents：组织阶段拆解与协作，解决“长任务是否可控”。
5. AI CLI：在真实仓库执行与验证，解决“结果是否可交付、可复盘”。

对应到工程问题的改善路径：

1. 语境漂移 -> 用项目规则 + Skills + 记忆策略收敛上下文。
2. 幻觉执行 -> 用 MCP 真源数据 + 脚本化校验降低误判。
3. 长链路断裂 -> 用 Agents 编排阶段门禁与回流。
4. 结果不可审计 -> 用 AI CLI 留下命令、日志、测试证据。

组件关系图（并列组件 + 协同执行）：

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=MzRkZGMzZjdmZTcwYmRhY2MwYzhhYTQ4MmVhMmI1OGZfYjE4YjE3MjMxMWQ5OWU1YTNhOTY2YjJlYjE0ZmYwYzlfSUQ6NzY0MTQ5NTgxNjA3NjM0OTE0N18xNzgzNjcwNjA2OjE3ODM2NzQyMDZfVjM)

[图表：内容未导出]

如果用一张图理解“并列组件如何协同”，可以参考下面这个执行闭环示意：

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=NjYzODE3MzMyNmU3NzQxYTdmMDIwOTMwNmFkYzUyY2JfOTRiNzU1OGZkOTUzOGZjNDYxMjIxNmVlODBmMzY1ZjNfSUQ6NzY0MTQ5NTgxNjc5MTk2OTUwMV8xNzgzNjcwNjA2OjE3ODM2NzQyMDZfVjM)

（图源：[OpenAI - Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)）

## 3. 为什么不能只做“纯 API”

纯 API 并非没用，而是它主要解决“模型可调用”；项目交付还需要补齐规则、上下文、执行、验证与回流。

3.1 基座能力与工程目标天然不一致

模型优化目标通常是“生成高概率、可读、符合指令的文本”，而工程目标是“可运行、可验证、可回滚、可审计的结果”。 
这两者不一致时，纯 API 容易出现：

1. 文本正确但工程不可落地。
2. 局部正确但系统层面冲突。
3. 一次回答可用但多轮迭代失稳。

### 3.2 纯 API 的四个结构性缺口

1. 上下文缺口：会话上下文有限，跨阶段信息容易丢失。
2. 约束缺口：团队规则、目录规范、门禁标准难以长期稳定约束输出。
3. 执行缺口：缺少真实环境的读写、测试、回归与证据链。
4. 编排缺口：长任务缺少阶段拆解、并行协同、失败回流机制。

### 3.3 从模型基座与产品栈看差距来源

在不自建完整工程栈的前提下，纯 API 的效果通常弱于原生产品，核心原因不只在模型本体，而在“训练先验 + 运行时系统”。

1. 控制协议先验差异（可理解为“控制 token/结构先验”）： 
原生产品通常围绕角色消息、工具调用、结构化输出形成稳定协议先验；裸 API 若只靠单层 prompt，控制信号更弱。
2. 预置提示词与层级指令差异： 
原生产品普遍有系统级指令栈（安全、格式、任务策略、工具路由）；纯 API 常见做法是单层指令，稳定性不足。
3. 上下文工程差异： 
原生产品一般有检索、重排、压缩、裁剪、记忆写回等策略；纯 API 若只拼接上下文，长链路任务更易漂移。
4. 偏好对齐差异： 
原生产品会持续吸收真实任务反馈做偏好对齐与策略更新；纯 API 若无同等反馈闭环，输出风格和执行习惯更波动。
5. RAG 与证据约束差异： 
原生产品通常把检索、引用、来源校验纳入链路；纯 API 若没有可靠 RAG 与证据门禁，幻觉与失配概率更高。

### 3.4 从训练分布看“为什么会这样”

1. 预训练目标是通用语言建模，不是你的项目交付目标。
2. 指令微调和偏好对齐提升的是“通用可用性”，不是“特定仓库规则一致性”。
3. 原生产品会把真实使用数据回流为策略迭代（例如工具调用成功/失败模式、长任务中断点）；纯 API 若没有同等回流机制，能力增长速度会慢。
4. 结论不是“API 一定弱”，而是“裸 API 若不补系统层，通常会弱于带原生工程栈的产品形态”。

### 3.5 纯 API 与原生产品形态的能力面对照

| 维度 | 纯 API（裸调用） | 原生产品（工程化形态） |
|-|-|-|
| 控制信号 | 单层 prompt 为主 | 多层策略与结构化协议 |
| 上下文处理 | 手工拼接为主 | 检索、重排、记忆、裁剪协同 |
| 工具调用 | 需自行编排 | 一般内置工具路由与失败恢复 |
| 偏好对齐 | 依赖调用方自建闭环 | 持续吸收真实任务反馈 |
| 证据与可追溯 | 需额外开发 | 通常更容易形成证据链 |
| 长任务稳定性 | 易受上下文漂移影响 | 更适合多阶段任务收口 |

同一任务在两条路线中的执行路径差异：

[图表：内容未导出]

### 3.6 典型失效模式（项目视角）

| 失效模式 | 纯 API 下常见表现 | 项目影响 |
|-|-|-|
| 语境漂移 | 多轮后偏离原始需求边界 | 返工增加，交付不稳定 |
| 局部最优 | 优化单文件，破坏系统一致性 | 架构债务累积 |
| 幻觉执行 | 给出“看似正确”的命令或配置 | 调试成本上升 |
| 不可复现 | 同类任务输出波动大 | 团队难以标准化复用 |

### 3.7 可操作判断标准

如果一个方案只给出 API 调用但无法回答下面问题，通常还不具备项目级落地条件：

1. 规则在哪里定义并版本化？
2. 上下文如何跨任务继承？
3. 失败样本如何回流成下一轮约束？
4. 测试、审查、提交证据如何留痕？
5. 谁负责任务拆解、协同和收口？

可先这样理解：

- 纯 API 解决“模型能不能答”。
- AI CLI + Skills + MCP + Agents 解决“团队能不能稳定交付”。

## 4. 常见工具分层

覆盖工具：Cursor、Copilot、Trae、Claude Code、Codex。 
下表按“任务粒度和治理深度”划分：

| 工具 | 典型定位 | 强项 | 常见短板（项目级场景） |
|-|-|-|-|
| Cursor | IDE 内智能编辑/Agent | 代码编辑与上下文规则紧耦合，MCP 接入顺滑 | 容易被用成“编辑器增强”，团队治理落地依赖自建流程 |
| Copilot | IDE 助手 + GitHub 工作流 Agent | 与 Issue/PR/Actions 集成深，组织策略能力强 | 与仓库平台绑定更深，跨平台流程可移植性受限 |
| Trae | AI IDE/Agent 工具 | 上手快，IDE 交互直观 | 企业级流程治理能力与生态成熟度仍需按团队标准评估 |
| Claude Code | 终端型项目 Agent | 项目记忆层次清晰（`CLAUDE.md`），适合端到端任务推进 | 需要团队具备明确 SOP 才能发挥上限 |
| Codex | 终端/云端项目 Agent | AGENTS 指令、工具环、可追溯执行链路强，适合项目级编排 | 同样要求团队有规范化工程流程 |

### 4.1 能力层级视图（避免把工具用错层）

| 层级 | 任务粒度 | 主要目标 | 更常见的主工具 |
|-|-|-|-|
| 补全层 | 行/函数 | 降低编码摩擦 | Copilot |
| 编辑层 | 文件/局部模块 | 加速改写与重构 | Cursor、Trae |
| 闭环层 | 需求/模块/里程碑 | 完成可验证交付 | Claude Code、Codex |
| 治理层 | 项目/团队 | 规则、门禁、审计、复用 | Claude Code、Codex + Skills + MCP |

### 4.2 同一任务对照案例（项目级视角）

案例任务：为“订单状态流转”新增幂等保护、失败补偿和告警链路（涉及接口、服务、任务调度、监控文档）。

路线 A（以 IDE 助手为主）常见路径：

1. 从当前打开文件开始改动，局部实现推进快。
2. 通过多轮对话补充上下文，逐步覆盖相邻文件。
3. 测试和回归依赖开发者手动组织。
4. 审查证据和变更边界通常在后置阶段补齐。

路线 B（以项目级 Agent 为主）常见路径：

1. 先定义 In Scope / Out of Scope，列出受影响模块。
2. 按阶段拆解：接口契约、幂等策略、补偿流程、告警接入、文档更新。
3. 每阶段执行“改动 + 验证 + 记录”，持续保留证据。
4. 收口时统一输出风险清单、回归结果和可复用步骤。

**对照观察（同等复杂度任务）：**

| 指标 | 路线 A（IDE 主） | 路线 B（项目级 Agent 主） |
|-|-|-|
| 任务覆盖完整性 | 依赖个人经验补齐 | 通过阶段清单系统覆盖 |
| 返工风险 | 常在联调/评审后暴露 | 多在阶段内前置发现 |
| 协作交接成本 | 上下文口头传递较多 | 证据链可直接交接 |
| 结果可审计性 | 需额外补文档 | 执行过程天然留痕 |
| SOP 复用价值 | 复用难度较高 | 易沉淀为 skill/规则 |

## 5. Cursor/Copilot/Trae 与 Claude Code/Codex 的核心差异

关键不在“能不能生成代码”，而在“更适合哪一层工作”。

| 维度 | IDE 内助手路线（Cursor/Copilot/Trae） | 项目级 Agent 路线（Claude Code/Codex） |
|-|-|-|
| 任务单位 | 常从文件/函数级开始 | 常从需求/模块/里程碑级开始 |
| 上下文组织 | 偏会话与编辑器上下文 | 偏项目规则与跨阶段上下文 |
| 执行形态 | 同步人机结对为主 | 可串行/并行编排，支持更完整任务链 |
| 治理能力 | 需要额外流程承接 | 更容易直接落在项目级门禁与记录体系上 |
| 结果可审计性 | 依赖团队补充制度 | 更容易形成“命令-输出-结论”证据链 |

结论： 
*IDE 内助手适合局部实现和即时编辑；项目主链路应放在项目级 Agent。以“文件/方法级交互”作为起点，通常会在多人协作阶段暴露上下文断裂与治理缺口。*

### 5.1 选路准则（先判任务，再选工具）

优先使用项目级 Agent 的场景：

1. 跨模块改动或存在系统性影响。
2. 需要测试门禁、审查留痕、可追溯交付。
3. 涉及多人协作、交接或分阶段推进。
4. 需要把本次流程沉淀为下次可复用资产。

优先使用 IDE 助手的场景：

1. 小范围局部修复或重构。
2. 需求边界明确、影响面可控。
3. 主要目标是提升单次编码效率。

[图表：内容未导出]

### 5.2 推荐组合方式（不是二选一）

1. 项目级 Agent 负责任务主线：边界、拆解、执行、门禁、收口。
2. IDE 助手负责局部提速：补全、局部改写、快速试验。
3. 以项目级规则文件统一约束，避免两条链路产出冲突。

## 6. Claude Code 和 Codex 的优势（对比 Cursor 类工具）

核心结论：在项目级交付场景中，Claude Code 和 Codex 的优势不在“补全更快”，而在“能把任务跑成闭环并长期复用”。

### 6.1 对比总览（项目级视角）

| 维度 | Cursor/Copilot/Trae（常见用法） | Claude Code/Codex（项目级用法） |
|-|-|-|
| 起始粒度 | 文件/函数级 | 需求/模块/里程碑级 |
| 主执行面 | IDE 对话与编辑 | 终端任务链与仓库现场 |
| 规则协同 | 常需额外约束 | 与 `CLAUDE.md` / `AGENTS.md` 协同更自然 |
| 工具调用 | 常偏编辑器插件能力 | 更适合脚本、MCP、命令链路整合 |
| 交付证据 | 需额外补记录 | 执行过程天然更易留痕 |

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=OWI1ZWQyYTliYmVjYzlhYTJhMDM5NzQ2YmJlZmFhNTRfMjgzOTQ0MzlmOTIwZWZmMWNlODAxMmMzZjFiOWIwOGFfSUQ6NzY0MTQ5NTgxNzk5MTc4NjIwN18xNzgzNjcwNjA2OjE3ODM2NzQyMDZfVjM)

（图源：[OpenAI - Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)）

### 6.2 优势一：任务编排能力更适配项目交付

1. 可以先拆任务再执行，而不是边写边补上下文。
2. 能清晰表达阶段依赖和并行关系，降低长任务断链风险。
3. 更容易将“实现、验证、收口”统一到一条执行链。

### 6.3 优势二：规则文件协同能力更强

1. `CLAUDE.md` / `AGENTS.md` 可直接承载项目约束、流程和边界。
2. 规则作为项目资产长期生效，减少“每次重新解释背景”。
3. 多人协作时，规则文件可作为统一执行基线。

### 6.4 优势三：工具与脚本整合更完整

1. 更适合把 shell、测试命令、质量检查脚本纳入同一链路。
2. 与 MCP 能力结合时，外部系统数据可直接进入执行过程。
3. 对“需要真实运行结果”的任务更有优势，而不仅是生成建议。

### 6.5 优势四：可审计与复盘能力更好

1. 更容易形成“输入-命令-输出-结论”的证据链。
2. 评审、回归、提交前检查可以标准化并重复执行。
3. 失败样本可直接回流为规则或 skill，形成持续改进。

### 6.6 边界说明：Cursor 类工具依然重要

1. 局部重构、界面微调、快速补全等场景仍然高效。
2. 推荐定位是“局部提速层”，不是“项目主链路层”。
3. 最优实践是组合使用：项目级 Agent 负责主线，IDE 助手负责局部效率。

## 7. 如何接入现有流程（VS Code / JetBrains）

核心原则：IDE 继续用于阅读、调试、断点；AI 执行放到终端，并且始终以需求/模块/里程碑为任务主线，而不是以文件编辑为主线。

### 7.0 下载、安装与基础使用（基础可用）

#### 7.0.1 前置条件

1. 本地可用终端环境（macOS/Linux/WSL/Windows）。
2. 项目代码仓库已可在本地打开。
3. 具备对应账号登录条件（Claude 账号或 OpenAI/ChatGPT 账号）。

#### 7.0.2 安装 Claude Code

常用安装方式（任选其一）：

1. macOS/Linux/WSL（原生安装）：`curl -fsSL https://claude.ai/install.sh | bash`
2. Homebrew：`brew install --cask claude-code`
3. Windows（PowerShell）：`irm https://claude.ai/install.ps1 | iex`

安装后验证：

1. `claude --version`
2. 首次登录：在终端执行 `claude`，按提示完成登录；需要切换账号时使用 `/login`。

#### 7.0.3 安装 Codex

常用安装方式（任选其一）：

1. npm：`npm install -g @openai/codex`
2. Homebrew：`brew install --cask codex`

安装后验证：

1. `codex --version`
2. 首次登录：执行 `codex` 并按提示登录（可使用 ChatGPT 登录流程）；如使用 API key，可配置 `OPENAI_API_KEY`。

#### 7.0.4 两个工具的最小使用流程

1. 进入项目根目录：`cd /path/to/repo`。
2. 启动会话：`claude` 或 `codex`。
3. 先做代码库理解任务：如“概述当前项目结构与主流程”。
4. 再做一个小改动任务：如“新增输入校验并补测试”。
5. 收口前执行：查看变更、运行测试、记录结果。

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=ZDRmMjAxNzY5YWMxZmRkNjdhM2MxZWEwMTA2NDg3MDNfYWMyMjk5N2UxN2Q0NmU2OTFjZTg2ZjhjNzUyMzFhY2FfSUQ6NzY0MTQ5NTgxNzk5MTc2OTgyM18xNzgzNjcwNjA2OjE3ODM2NzQyMDZfVjM)

（图源：[OpenAI Codex CLI GitHub](https://github.com/openai/codex)）

#### 7.0.5 基础命令速查

| 工具 | 进入交互 | 单次任务 | 恢复会话 | 版本检查 |
|-|-|-|-|-|
| Claude Code | `claude` | `claude -p "问题"` | `claude -c` / `claude -r` | `claude --version` |
| Codex | `codex` | `codex "任务描述"` | 在当前目录重启 `codex` 继续 | `codex --version` |

#### 7.0.6 外部教程链接（可直接跳转）

Claude Code：

1. [Quickstart（官方）](https://docs.anthropic.com/en/docs/claude-code/quickstart)
2. [Setup（安装与系统配置）](https://docs.anthropic.com/en/docs/claude-code/setup)
3. [Common workflows（常见工作流）](https://docs.anthropic.com/en/docs/claude-code/common-workflows)
4. [Memory / ](https://docs.anthropic.com/en/docs/claude-code/memory)[`CLAUDE.md`](https://docs.anthropic.com/en/docs/claude-code/memory)[（项目记忆）](https://docs.anthropic.com/en/docs/claude-code/memory)

Codex：

1. [Codex CLI（官方入门）](https://developers.openai.com/codex/cli)
2. [Codex CLI GitHub README](https://github.com/openai/codex)
3. [Codex 产品概览（官方）](https://platform.openai.com/docs/codex/overview)
4. [Codex Agent Loop（工程化思路）](https://openai.com/index/unrolling-the-codex-agent-loop/)

### 7.1 接入作业清单（第一周可完成）

| 作业项 | 完成标准 | 产物 |
|-|-|-|
| 项目规则落地 | 根目录存在且启用 `AGENTS.md` 或 `CLAUDE.md` | 规则文件初版 |
| 高价值 skill 建立 | 至少覆盖实现、审查、收口三类任务 | skills 目录与说明 |
| 门禁命令统一 | 测试、静态检查、提交前检查可一键执行 | 命令清单或脚本 |
| 证据模板启用 | 每次任务都能记录关键命令与结果 | review/变更记录模板 |
| 任务单位统一 | 以需求/模块/里程碑作为分配单位 | 任务看板字段更新 |

### 7.2 日常执行链路（项目级主线）

1. 需求澄清：锁定 In Scope / Out of Scope，定义项目级交付目标。
2. 上下文读取：先读后改，明确影响面和依赖关系。
3. 实现与验证：小步改动，随改随测，保证阶段可回滚。
4. 风险审查：输出阻断项、风险级别、修复建议。
5. 收口提交：留痕、归档、回流为规则或 skill。

项目执行闭环图：

![](https://internal-api-drive-stream-sg.larksuite.com/space/api/box/stream/download/authcode/?code=NTU2ZjA4NTZjZWFhYzM4YWUyNjVkZmJlYmM4ZGFhNjJfM2Q1N2IyYWVhOTVlMjNmMzEzYzdmYjUzZmQ3MzdiNjZfSUQ6NzY0MTQ5NTgxNzk5MTk1MDA0N18xNzgzNjcwNjA2OjE3ODM2NzQyMDZfVjM)

### 7.3 工具角色分工

1. VS Code / JetBrains：阅读代码、断点调试、Diff 审阅。
2. Claude Code / Codex：承接项目任务、执行任务链、输出证据。
3. 项目规则文件：定义统一约束，避免不同工具产出冲突。

### 7.4 验收标准（接入是否成功）

满足以下条件，可判定“项目级 AI 编程接入成功”：

1. 连续两周任务记录中，项目级任务占比 ≥ 80%。
2. 每个任务都有可复盘证据（命令、测试、审查、结论）。
3. 提交前门禁执行率达到 100%。
4. 至少 3 个高频任务已沉淀为可复用 skills。
5. 返工主要集中在需求变化，而不是流程断链。

### 7.5 常见失败信号（越早发现越好）

1. 任务仍以“改某个文件”为单位分配。
2. 大量结果停留在对话文本，缺少可执行产物。
3. 评审时才集中暴露跨模块问题。
4. 相同类型问题反复出现，未沉淀为规则或 skill。
5. 工具切换频繁，但关键指标无改善。

### 7.6 修正动作（对应失败信号）

| 失败信号 | 修正动作 |
|-|-|
| 文件级任务主导 | 改为“需求/模块/里程碑”三段式任务描述 |
| 无证据留痕 | 提交前强制附带命令和测试结果摘要 |
| 评审后集中返工 | 增加阶段性风险审查与中间门禁 |
| 同类问题反复出现 | 将问题转写为规则条目或新 skill |
| 指标不改善 | 按第 8 章指标复盘并调整主链路 |

## 8. 团队落地建议（从 0 到 1）

1. 先选一个高频场景（如接口改造或缺陷修复）做试点。
2. 先做最小闭环，不要一开始全量改造。
3. 先稳定“规则 + 执行 + 审查”三件事，再扩展工具。
4. 用统一指标评估：一次通过率、返工轮次、平均交付时长、流程复用率。

### 8.1 阶段推进路线图（按能力信号推进）

不按固定周数推进，按“能力是否稳定”推进。

| 阶段 | 进入条件 | 完成标志 | 下一步重点 |
|-|-|-|-|
| 阶段 A：闭环可跑 | 已选定一个高频场景 | 可连续完成“需求-实现-审查-收口”闭环，且有证据留痕 | 扩展到同类任务 |
| 阶段 B：流程可复用 | 同类任务开始重复出现 | 规则文件、门禁命令、记录模板已稳定复用 | 引入自动化能力 |
| 阶段 C：能力可扩展 | 团队已有稳定主链路 | MCP、脚本接入后，返工和漏检继续下降 | 建立持续运营机制 |
| 阶段 D：体系可进化 | 已形成基础 skill 库 | 失败样本可持续回流，规则与 skill 版本可迭代 | 按指标常态化优化 |

推进原则：

1. 先达成“阶段完成标志”，再进入下一阶段。
2. 若关键指标回退，回到上一阶段修复，不做名义升级。
3. 阶段目标是稳定能力，不是追求接入速度。

## 9. 常见误区

1. 把 AI 编程等同于“自动补全增强”。
2. 把任务起点放在方法/文件级改写，而不是项目级闭环。
3. 只讨论模型，不讨论流程与门禁。
4. 直接追求多工具堆叠，忽略边界与治理。
5. 把 AI 当“单次对话产出器”，不做证据记录与复盘。
6. 在没有统一评分标准时直接全员切换工具。

## 10. 参考资料

1. Cursor Rules: https://docs.cursor.com/context/rules-for-ai
2. Cursor MCP: https://docs.cursor.com/en/context/mcp
3. GitHub Copilot coding agent: https://docs.github.com/en/copilot/concepts/about-copilot-coding-agent
4. GitHub Copilot custom instructions: https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions
5. GitHub Copilot MCP: https://docs.github.com/en/copilot/concepts/extensions
6. Anthropic Claude Code quickstart: https://docs.anthropic.com/en/docs/claude-code/quickstart
7. Anthropic Claude Code memory (`CLAUDE.md`): https://docs.anthropic.com/en/docs/claude-code/memory
8. OpenAI Codex cloud overview: https://platform.openai.com/docs/codex/overview
9. OpenAI Docs MCP (含 Codex/Cursor/Copilot 配置示例): https://platform.openai.com/docs/docs-mcp
10. OpenAI “Unrolling the Codex agent loop”: https://openai.com/index/unrolling-the-codex-agent-loop/
11. OpenAI “Introducing Codex”: https://openai.com/index/introducing-codex/
12. Trae IDE docs (功能说明): https://traeide.com/docs/how-to-use-trae-auto-completion
13. ByteDance Trae Agent (开源): https://github.com/bytedance/trae-agent
14. Anthropic Claude Code setup: https://docs.anthropic.com/en/docs/claude-code/setup
15. OpenAI Codex CLI (GitHub): https://github.com/openai/codex
16. OpenAI Codex CLI getting started: https://help.openai.com/en/articles/11096431-codex-cli-getting-started
