import { load, type Store } from "@tauri-apps/plugin-store";

export interface AiLabConfig {
  baseUrl: string;
  apiKey: string;
  chatModel: string;
  embeddingBaseUrl: string;
  embeddingApiKey: string;
  embeddingModel: string;
}

const STORE_FILE = "ai-lab-config.json";
const DEFAULT_CHAT_MODEL = "claude-sonnet-4-5-20250929";
const DEFAULT_EMBEDDING_MODEL = "doubao-embedding-vision-251215";

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load(STORE_FILE, { autoSave: true, defaults: {} });
  }
  return storePromise;
}

export async function getConfig(): Promise<AiLabConfig | null> {
  const store = await getStore();
  const baseUrl = await store.get<string>("baseUrl");
  const apiKey = await store.get<string>("apiKey");
  const embeddingBaseUrl = await store.get<string>("embeddingBaseUrl");
  const embeddingApiKey = await store.get<string>("embeddingApiKey");
  if (!baseUrl || !apiKey || !embeddingBaseUrl || !embeddingApiKey) return null;

  const chatModel = await store.get<string>("chatModel");
  const embeddingModel = await store.get<string>("embeddingModel");
  return {
    baseUrl,
    apiKey,
    embeddingBaseUrl,
    embeddingApiKey,
    chatModel: chatModel || DEFAULT_CHAT_MODEL,
    embeddingModel: embeddingModel || DEFAULT_EMBEDDING_MODEL,
  };
}

/** 宽松读取：不校验完整性，用于设置表单回填，避免"某一项没填就把已保存的其它项也显示为空"。 */
export async function getRawConfig(): Promise<AiLabConfig> {
  const store = await getStore();
  return {
    baseUrl: (await store.get<string>("baseUrl")) || "",
    apiKey: (await store.get<string>("apiKey")) || "",
    embeddingBaseUrl: (await store.get<string>("embeddingBaseUrl")) || "",
    embeddingApiKey: (await store.get<string>("embeddingApiKey")) || "",
    chatModel: (await store.get<string>("chatModel")) || DEFAULT_CHAT_MODEL,
    embeddingModel: (await store.get<string>("embeddingModel")) || DEFAULT_EMBEDDING_MODEL,
  };
}

export async function setConfig(config: AiLabConfig): Promise<void> {
  const store = await getStore();
  await store.set("baseUrl", config.baseUrl);
  await store.set("apiKey", config.apiKey);
  await store.set("embeddingBaseUrl", config.embeddingBaseUrl);
  await store.set("embeddingApiKey", config.embeddingApiKey);
  await store.set("chatModel", config.chatModel || DEFAULT_CHAT_MODEL);
  await store.set("embeddingModel", config.embeddingModel || DEFAULT_EMBEDDING_MODEL);
  await store.save();
}

export async function hasConfig(): Promise<boolean> {
  return (await getConfig()) !== null;
}
