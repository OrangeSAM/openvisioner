<script setup lang="ts">
import { ref } from "vue";
import ChatView from "./components/ChatView.vue";
import PushPanel from "./components/PushPanel.vue";
import SettingsDialog from "./components/SettingsDialog.vue";

type Tab = "chat" | "push";

const activeTab = ref<Tab>("chat");
const showSettings = ref(false);
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand">
        <span class="brand-glow" aria-hidden="true"></span>
        <div class="brand-text">
          <h1>敞亮人</h1>
          <span class="brand-eyebrow">OPENVISION · 入职导航</span>
        </div>
      </div>

      <nav class="tabs">
        <button :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">问答</button>
        <button :class="{ active: activeTab === 'push' }" @click="activeTab = 'push'">今日推送</button>
      </nav>

      <button class="settings-btn" @click="showSettings = true">⚙ 设置</button>
    </header>

    <main class="app-body">
      <ChatView v-show="activeTab === 'chat'" />
      <PushPanel v-show="activeTab === 'push'" />
    </main>

    <SettingsDialog v-if="showSettings" @close="showSettings = false" @saved="showSettings = false" />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--paper);
}

.app-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-4) var(--space-8);
  border-bottom: 1px solid var(--mist);
  background: var(--paper);
  overflow: hidden;
}

.brand {
  position: relative;
  display: flex;
  align-items: center;
}

.brand-glow {
  position: absolute;
  left: -36px;
  top: 50%;
  width: 140px;
  height: 140px;
  transform: translateY(-50%);
  background: radial-gradient(circle, rgba(232, 163, 61, 0.55) 0%, rgba(232, 163, 61, 0) 70%);
  pointer-events: none;
  animation: glow-breathe 8s ease-in-out infinite;
}

@keyframes glow-breathe {
  0%, 100% { opacity: 0.7; transform: translateY(-50%) scale(1); }
  50% { opacity: 1; transform: translateY(-50%) scale(1.08); }
}

.brand-text {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-text h1 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.5rem;
  margin: 0;
  color: var(--ink);
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.brand-eyebrow {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  color: var(--ink-faint);
  white-space: nowrap;
}

.tabs {
  display: flex;
  gap: var(--space-1);
  flex: 1;
  background: var(--mist);
  padding: 4px;
  border-radius: var(--radius-pill);
  width: fit-content;
}

.tabs button {
  background: none;
  box-shadow: none;
  border: none;
  color: var(--ink-soft);
  font-size: 0.88rem;
  padding: 7px 18px;
  border-radius: var(--radius-pill);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.tabs button.active {
  background: var(--paper-lifted);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
  font-weight: 600;
}

.settings-btn {
  background: none;
  box-shadow: none;
  border: none;
  color: var(--ink-soft);
  font-size: 0.85rem;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  transition: background-color 0.15s ease;
}

.settings-btn:hover {
  background: var(--mist);
}

.app-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: var(--paper);
}

.app-body > * {
  height: 100%;
}
</style>
