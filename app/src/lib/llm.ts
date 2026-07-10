import { getConfig } from "./config";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class LlmConfigError extends Error {}

async function requireConfig() {
  const config = await getConfig();
  if (!config) {
    throw new LlmConfigError("AI 服务未配置：请先在设置中填写 AI LAB 和向量服务的 Base URL / API Key");
  }
  return config;
}

function trimBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

/** Anthropic Messages 兼容接口：POST {baseUrl}/v1/messages */
export async function chatComplete(
  messages: ChatMessage[],
  system: string,
  opts: { maxTokens?: number } = {},
): Promise<string> {
  const config = await requireConfig();
  const res = await fetch(`${trimBaseUrl(config.baseUrl)}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.chatModel,
      max_tokens: opts.maxTokens ?? 1024,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI LAB 对话接口请求失败 (${res.status})：${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const block = Array.isArray(data?.content)
    ? data.content.find((c: { type: string }) => c.type === "text")
    : null;
  if (!block?.text) {
    throw new Error("AI LAB 对话接口返回内容为空或格式异常");
  }
  return block.text as string;
}

/** 火山方舟多模态向量接口：POST {embeddingBaseUrl}/api/v3/embeddings/multimodal
 * 该接口一次调用只返回一个融合向量，不支持像 OpenAI 那样批量传入多段文本，
 * 因此这里对外仍保持"传入多段文本、按序返回多个向量"的批量语义，内部改为逐条并发请求。 */
async function embedOne(text: string, config: Awaited<ReturnType<typeof requireConfig>>): Promise<number[]> {
  const res = await fetch(`${trimBaseUrl(config.embeddingBaseUrl)}/api/v3/embeddings/multimodal`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.embeddingApiKey}`,
    },
    body: JSON.stringify({
      model: config.embeddingModel,
      input: [{ type: "text", text }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`向量服务请求失败 (${res.status})：${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const embedding = data?.data?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error("向量服务返回格式异常");
  }
  return embedding as number[];
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const config = await requireConfig();
  return Promise.all(texts.map((text) => embedOne(text, config)));
}
