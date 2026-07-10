<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { getRawConfig, setConfig } from "../lib/config";

const emit = defineEmits<{ (e: "saved"): void; (e: "close"): void }>();

const form = reactive({
  baseUrl: "",
  apiKey: "",
  chatModel: "claude-sonnet-4-5-20250929",
  embeddingBaseUrl: "https://ark.cn-beijing.volces.com",
  embeddingApiKey: "",
  embeddingModel: "doubao-embedding-vision-251215",
});

const saving = ref(false);
const savedHint = ref(false);
const errorText = ref("");

onMounted(async () => {
  const config = await getRawConfig();
  form.baseUrl = config.baseUrl;
  form.apiKey = config.apiKey;
  form.chatModel = config.chatModel;
  form.embeddingBaseUrl = config.embeddingBaseUrl;
  form.embeddingApiKey = config.embeddingApiKey;
  form.embeddingModel = config.embeddingModel;
});

async function save() {
  saving.value = true;
  savedHint.value = false;
  errorText.value = "";
  try {
    await setConfig({ ...form });
    savedHint.value = true;
    emit("saved");
  } catch (err) {
    errorText.value = `保存失败：${err instanceof Error ? err.message : String(err)}`;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="settings-overlay" @click.self="emit('close')">
    <div class="settings-panel">
      <div class="settings-header">
        <h2>连接 AI 服务</h2>
        <button class="icon-btn" @click="emit('close')">✕</button>
      </div>
      <p class="hint">配置仅保存在本机应用数据目录，不会写入代码仓库。</p>

      <p class="section-label">对话服务（AI LAB）</p>
      <label>
        Base URL
        <input v-model="form.baseUrl" placeholder="https://ai-lab.example.com" />
      </label>
      <label>
        API Key
        <input v-model="form.apiKey" type="password" placeholder="sk-..." />
      </label>
      <label>
        对话模型
        <input v-model="form.chatModel" />
      </label>

      <p class="section-label">向量服务（火山方舟）</p>
      <label>
        向量服务 Base URL
        <input v-model="form.embeddingBaseUrl" placeholder="https://ark.cn-beijing.volces.com" />
      </label>
      <label>
        向量服务 API Key
        <input v-model="form.embeddingApiKey" type="password" placeholder="AK-..." />
      </label>
      <label>
        向量模型
        <input v-model="form.embeddingModel" />
      </label>

      <div class="actions">
        <button class="primary" :disabled="saving" @click="save">
          {{ saving ? "保存中…" : "保存" }}
        </button>
        <span v-if="savedHint" class="saved-hint">已保存</span>
      </div>
      <p v-if="errorText" class="error-text">{{ errorText }}</p>
    </div>
  </div>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(35, 32, 26, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.settings-panel {
  background: var(--paper-lifted);
  border: 1px solid var(--mist);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  width: 420px;
  max-width: 90vw;
  box-shadow: var(--shadow-lg);
  text-align: left;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-header h2 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.2rem;
  margin: 0;
  color: var(--ink);
}

.icon-btn {
  background: none;
  border: none;
  box-shadow: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 4px 8px;
  color: var(--ink-faint);
  border-radius: var(--radius-sm);
}

.icon-btn:hover {
  background: var(--mist);
  color: var(--ink);
}

.hint {
  font-size: 0.8rem;
  color: var(--ink-faint);
  margin: var(--space-2) 0 var(--space-6);
}

.section-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ink-faint);
  margin: var(--space-5) 0 var(--space-3);
  text-transform: uppercase;
}

.section-label:first-of-type {
  margin-top: 0;
}

label {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: 0.85rem;
  color: var(--ink-soft);
  margin-bottom: var(--space-4);
}

input {
  font-size: 0.9rem;
  background: var(--paper);
  border: 1px solid var(--mist);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  color: var(--ink);
}

input:focus-visible {
  border-color: var(--sky);
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-2);
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

.saved-hint {
  color: var(--sky);
  font-size: 0.85rem;
}

.error-text {
  color: var(--rust);
  background: var(--rust-bg);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
  margin-top: var(--space-4);
  font-size: 0.85rem;
}
</style>
