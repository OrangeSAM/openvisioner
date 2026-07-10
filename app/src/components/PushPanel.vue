<script setup lang="ts">
import { ref } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { chatComplete, LlmConfigError } from "../lib/llm";
import { loadChatDigest, loadTrainingPlan } from "../lib/retrieval";

interface DocRef {
  title: string;
  sourceUrl: string;
  domain: string;
}

interface ManifestEntry {
  path: string;
  title: string;
  sourceUrl: string;
  domain: string;
}

const GROUP_DIGEST_LABEL = "近期群内讨论摘要（已脱敏，不含发言人与原文）";

const suggestions = ref<string[]>([]);
const rawAnswer = ref("");
const docSources = ref<DocRef[]>([]);
const usedDigest = ref(false);
const loading = ref(false);
const errorText = ref("");
const triggeredAt = ref<string | null>(null);

async function loadManifest(): Promise<ManifestEntry[]> {
  const res = await fetch("/knowledge/manifest.json");
  if (!res.ok) return [];
  const data = await res.json();
  return data.documents ?? [];
}

async function loadDocExcerpt(path: string): Promise<string> {
  const res = await fetch(`/knowledge/${path}`);
  if (!res.ok) return "";
  const raw = await res.text();
  const body = raw.replace(/^---[\s\S]*?---\s*/, "");
  return body.slice(0, 600);
}

function buildSystemPrompt(): string {
  return [
    "你是「敞亮人」，负责为新人 fly 生成每日入职「今日建议」简报。",
    "基于提供的【培训计划当前阶段】【相关文档摘录】【群内近期讨论摘要】，生成 2-3 条具体可执行的今日建议。",
    "格式要求：每条建议单独一行，以 \"- \" 开头；建议末尾用括号标注来源，例如 （来源：产品需求文档《XXX》）或（来源：近期群内讨论摘要）。",
    "严格禁止：不得在建议中提及任何具体人名，不得逐字引用群聊原文，只能转述摘要要点。",
    "如果某类资料没有提供，就不要编造对应来源。",
  ].join("\n");
}

function buildUserPrompt(
  plan: Awaited<ReturnType<typeof loadTrainingPlan>>,
  docExcerpts: { title: string; text: string }[],
  digest: Awaited<ReturnType<typeof loadChatDigest>>,
): string {
  const parts: string[] = [];
  parts.push(
    `【培训计划当前阶段】\n${plan.current_focus.period}（${plan.current_focus.note}）\n` +
      plan.current_focus.items.map((it) => `- ${it}`).join("\n"),
  );
  if (docExcerpts.length > 0) {
    parts.push(
      "【相关文档摘录】\n" +
        docExcerpts.map((d) => `《${d.title}》\n${d.text}`).join("\n\n"),
    );
  }
  if (digest.digest.length > 0) {
    parts.push(
      "【群内近期讨论摘要】\n" +
        digest.digest.map((d) => `- ${d.topic}：${d.summary}`).join("\n"),
    );
  }
  return parts.join("\n\n");
}

function parseSuggestions(text: string): string[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());
  return lines.length > 0 ? lines : [text.trim()];
}

async function notifyToday(firstSuggestion: string) {
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }
    if (granted) {
      await sendNotification({
        title: "敞亮人 · 今日建议",
        body: firstSuggestion,
      });
    }
  } catch {
    // 系统通知不可用时静默忽略，不影响面板内展示
  }
}

async function trigger() {
  loading.value = true;
  errorText.value = "";
  suggestions.value = [];
  docSources.value = [];
  usedDigest.value = false;

  try {
    const [plan, digest, manifest] = await Promise.all([
      loadTrainingPlan(),
      loadChatDigest(),
      loadManifest(),
    ]);

    const relatedPaths = plan.current_focus.related_docs ?? [];
    const manifestByPath = new Map(manifest.map((m) => [m.path, m]));
    const docExcerpts = await Promise.all(
      relatedPaths.map(async (path) => {
        const entry = manifestByPath.get(path);
        const text = await loadDocExcerpt(path);
        return {
          title: entry?.title ?? path,
          sourceUrl: entry?.sourceUrl ?? "",
          domain: entry?.domain ?? "",
          text,
        };
      }),
    );

    const answer = await chatComplete(
      [{ role: "user", content: buildUserPrompt(plan, docExcerpts, digest) }],
      buildSystemPrompt(),
    );

    rawAnswer.value = answer;
    suggestions.value = parseSuggestions(answer);
    docSources.value = docExcerpts
      .filter((d) => d.sourceUrl)
      .map((d) => ({ title: d.title, sourceUrl: d.sourceUrl, domain: d.domain }));
    usedDigest.value = digest.digest.length > 0;
    triggeredAt.value = new Date().toLocaleString("zh-CN", { hour12: false });

    await notifyToday(suggestions.value[0] ?? answer);
  } catch (err) {
    errorText.value =
      err instanceof LlmConfigError
        ? err.message
        : `生成今日建议失败：${err instanceof Error ? err.message : String(err)}`;
  } finally {
    loading.value = false;
  }
}

async function openSource(url: string) {
  try {
    await openUrl(url);
  } catch {
    // 忽略外部链接打开失败
  }
}
</script>

<template>
  <div class="push-panel">
    <div class="push-card">
      <div class="push-card-header">
        <div>
          <h2>今日建议</h2>
          <p class="subtitle">根据 fly 的入职进度与近期讨论实时生成</p>
        </div>
        <button class="primary" :disabled="loading" @click="trigger">
          {{ loading ? "生成中…" : "生成今日建议" }}
        </button>
      </div>

      <p v-if="triggeredAt" class="triggered-at">触发时间：{{ triggeredAt }}</p>

      <p v-if="errorText" class="error-text">{{ errorText }}</p>

      <div v-else-if="suggestions.length > 0" class="suggestions">
        <div v-for="(s, i) in suggestions" :key="i" class="suggestion-item">
          <span class="suggestion-dot"></span>
          <span>{{ s }}</span>
        </div>
      </div>

      <p v-else-if="!loading" class="empty-hint">
        点击"生成今日建议"，看看今天适合推进什么。
      </p>

      <div v-if="docSources.length > 0 || usedDigest" class="sources">
        <span class="sources-label">参考来源</span>
        <button
          v-for="(s, i) in docSources"
          :key="i"
          class="source-chip"
          :class="s.domain"
          @click="openSource(s.sourceUrl)"
        >
          {{ s.title }}
        </button>
        <span v-if="usedDigest" class="source-chip static">{{ GROUP_DIGEST_LABEL }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.push-panel {
  height: 100%;
  overflow-y: auto;
  padding: var(--space-8);
  display: flex;
  justify-content: center;
  background: var(--paper);
}

.push-card {
  background: var(--paper-lifted);
  border: 1px solid var(--mist);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--space-6) var(--space-8);
  width: 100%;
  max-width: 560px;
  height: fit-content;
  text-align: left;
}

.push-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.primary {
  background: var(--dawn);
  color: var(--ink);
  font-weight: 600;
  border: none;
  border-radius: var(--radius-pill);
  padding: var(--space-3) var(--space-6);
  box-shadow: none;
  white-space: nowrap;
}

.primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.push-card-header h2 {
  font-family: var(--font-display);
  font-weight: 600;
  margin: 0;
  font-size: 1.3rem;
  color: var(--ink);
}

.subtitle {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: var(--ink-faint);
}

.triggered-at {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--ink-faint);
  margin: var(--space-3) 0 0;
}

.empty-hint {
  color: var(--ink-soft);
  font-size: 0.92rem;
  margin-top: var(--space-6);
  line-height: 1.7;
}

.error-text {
  color: var(--rust);
  background: var(--rust-bg);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
  margin-top: var(--space-5);
  font-size: 0.85rem;
}

.suggestions {
  margin-top: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  background: var(--paper);
  border: 1px solid var(--mist);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: 0.92rem;
  line-height: 1.6;
  white-space: pre-wrap;
}

.suggestion-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--dawn);
}

.sources {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--mist);
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

.source-chip.static {
  color: var(--ink-faint);
  cursor: default;
  background: var(--mist);
}
</style>
