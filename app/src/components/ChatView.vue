<script setup lang="ts">
import { nextTick, reactive, ref } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { chatComplete, LlmConfigError } from "../lib/llm";
import { search, type SearchResult } from "../lib/retrieval";

interface SourceRef {
  title: string;
  sourceUrl: string;
  domain: string;
}

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
  isError?: boolean;
}

const DOMAIN_LABEL: Record<string, string> = {
  company: "公司通用",
  department: "部门业务（QQZ智能客服）",
};

const messages = reactive<ChatEntry[]>([]);
const input = ref("");
const loading = ref(false);
const scrollAnchor = ref<HTMLElement | null>(null);

async function scrollToBottom() {
  await nextTick();
  scrollAnchor.value?.scrollIntoView({ behavior: "smooth" });
}

function dedupeSources(results: SearchResult[]): SourceRef[] {
  const seen = new Set<string>();
  const sources: SourceRef[] = [];
  for (const r of results) {
    if (seen.has(r.docPath)) continue;
    seen.add(r.docPath);
    sources.push({ title: r.title, sourceUrl: r.sourceUrl, domain: r.domain });
  }
  return sources;
}

function buildSystemPrompt(): string {
  return [
    "你是「敞亮人」，敞亮科技的新人入职导航助手。",
    "你只能依据下面提供的【参考资料】回答问题，参考资料分为「公司通用」（企业文化、HR/行政/财务制度）和「部门业务（QQZ智能客服）」（产品、技术、需求文档）两类。",
    "回答要求：",
    "1. 用简洁自然的中文回答，不要逐字复述资料原文，要总结提炼。",
    "2. 如果参考资料不足以回答问题，明确说\"目前的知识库里没有找到相关信息\"，不要编造。",
    "3. 不需要在正文里手写来源链接，来源会由界面单独展示。",
  ].join("\n");
}

function buildUserPrompt(question: string, results: SearchResult[]): string {
  const context = results
    .map((r, i) => `[资料${i + 1} | ${DOMAIN_LABEL[r.domain] ?? r.domain} | 《${r.title}》]\n${r.text}`)
    .join("\n\n");
  return `【参考资料】\n${context || "（未检索到相关资料）"}\n\n【问题】\n${question}`;
}

async function send() {
  const question = input.value.trim();
  if (!question || loading.value) return;

  messages.push({ role: "user", content: question });
  input.value = "";
  loading.value = true;
  await scrollToBottom();

  try {
    const results = await search(question, 5);
    const answer = await chatComplete(
      [{ role: "user", content: buildUserPrompt(question, results) }],
      buildSystemPrompt(),
    );
    messages.push({ role: "assistant", content: answer, sources: dedupeSources(results) });
  } catch (err) {
    const text =
      err instanceof LlmConfigError
        ? err.message
        : `请求失败：${err instanceof Error ? err.message : String(err)}`;
    messages.push({ role: "assistant", content: text, isError: true });
  } finally {
    loading.value = false;
    await scrollToBottom();
  }
}

async function openSource(url: string) {
  try {
    await openUrl(url);
  } catch {
    // 打开外部链接失败时静默忽略，不影响对话继续
  }
}

const SUGGESTIONS = ["我们智能客服用的什么 IM 技术选型？", "公司的行政制度在哪里看？"];

function useSuggestion(text: string) {
  input.value = text;
}
</script>

<template>
  <div class="chat-view">
    <div class="messages">
      <div v-if="messages.length === 0" class="empty-state">
        <p class="empty-headline">从哪个问题开始都可以</p>
        <div class="suggestion-pills">
          <button
            v-for="(s, i) in SUGGESTIONS"
            :key="i"
            class="suggestion-pill"
            @click="useSuggestion(s)"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="bubble-row"
        :class="msg.role"
      >
        <div class="bubble" :class="{ error: msg.isError }">
          <p class="content">{{ msg.content }}</p>
          <div v-if="msg.sources && msg.sources.length" class="sources">
            <span class="sources-label">来源</span>
            <button
              v-for="(s, si) in msg.sources"
              :key="si"
              class="source-chip"
              :class="s.domain"
              @click="openSource(s.sourceUrl)"
            >
              {{ DOMAIN_LABEL[s.domain] ?? s.domain }} · {{ s.title }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="bubble-row assistant">
        <div class="bubble loading">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      </div>

      <div ref="scrollAnchor"></div>
    </div>

    <form class="composer" @submit.prevent="send">
      <input
        v-model="input"
        placeholder="输入你的问题…"
        :disabled="loading"
      />
      <button type="submit" class="primary" :disabled="loading || !input.trim()">发送</button>
    </form>
  </div>
</template>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--paper);
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6) var(--space-8);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  text-align: left;
}

.empty-state {
  margin: var(--space-14) auto 0;
  max-width: 480px;
  text-align: center;
}

.empty-headline {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 500;
  font-size: 1.4rem;
  color: var(--ink-soft);
  margin: 0 0 var(--space-5);
}

.suggestion-pills {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
}

.suggestion-pill {
  background: var(--paper-lifted);
  border: 1px solid var(--mist);
  color: var(--ink);
  font-size: 0.88rem;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-sm);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.suggestion-pill:hover {
  border-color: var(--dawn);
  box-shadow: var(--shadow-md);
}

.bubble-row {
  display: flex;
}

.bubble-row.user {
  justify-content: flex-end;
}

.bubble-row.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 80%;
  background: var(--paper-lifted);
  border: 1px solid var(--mist);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  box-shadow: var(--shadow-sm);
}

.bubble-row.user .bubble {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper);
}

.bubble.error {
  background: var(--rust-bg);
  border-color: var(--rust-bg);
  color: var(--rust);
}

.bubble.loading {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: var(--space-4);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ink-faint);
  animation: dot-pulse 1.2s ease-in-out infinite;
}

.dot:nth-child(2) { animation-delay: 0.15s; }
.dot:nth-child(3) { animation-delay: 0.3s; }

@keyframes dot-pulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

.content {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
}

.sources {
  margin-top: var(--space-3);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.sources-label {
  font-size: 0.72rem;
  color: var(--ink-faint);
}

.source-chip {
  font-size: 0.75rem;
  background: var(--mist);
  color: var(--ink-soft);
  border: none;
  border-radius: var(--radius-pill);
  padding: 3px 11px;
  cursor: pointer;
  box-shadow: none;
  transition: filter 0.15s ease;
}

.source-chip:hover {
  filter: brightness(0.95);
}

.source-chip.company {
  background: var(--coral-bg);
  color: var(--coral);
}

.source-chip.department {
  background: var(--sky-bg);
  color: var(--sky);
}

.composer {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-8);
  border-top: 1px solid var(--mist);
  background: var(--paper-lifted);
}

.composer input {
  flex: 1;
  background: var(--paper);
  border: 1px solid var(--mist);
  border-radius: var(--radius-pill);
  padding: var(--space-3) var(--space-5);
  font-size: 0.92rem;
  color: var(--ink);
}

.composer input:focus-visible {
  border-color: var(--sky);
}

.primary {
  background: var(--dawn);
  color: var(--ink);
  font-weight: 600;
  border: none;
  border-radius: var(--radius-pill);
  padding: var(--space-3) var(--space-6);
  box-shadow: none;
}

.primary:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
