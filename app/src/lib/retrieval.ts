import { embed } from "./llm";

export interface KnowledgeDoc {
  path: string;
  title: string;
  domain: string;
  sourceUrl: string;
}

interface Manifest {
  documents: KnowledgeDoc[];
}

export interface Chunk {
  id: string;
  docPath: string;
  title: string;
  sourceUrl: string;
  domain: string;
  text: string;
  embedding: number[];
}

export interface SearchResult extends Chunk {
  score: number;
}

const CACHE_KEY = "openvision-embeddings-cache-v1";
const CHUNK_TARGET_LEN = 450;
const EMBED_BATCH_SIZE = 20;

interface CacheEntry {
  text: string;
  embedding: number[];
}

function loadCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CacheEntry>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage 不可用或已满：缓存是尽力而为，跳过即可
  }
}

function chunkMarkdown(raw: string): string[] {
  const body = raw.replace(/^---[\s\S]*?---\s*/, "");
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    if (current && (current.length + para.length + 2) > CHUNK_TARGET_LEN) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length >= 20);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

let indexPromise: Promise<Chunk[]> | null = null;

async function fetchManifest(): Promise<Manifest> {
  const res = await fetch("/knowledge/manifest.json");
  if (!res.ok) {
    throw new Error("无法加载知识库 manifest.json");
  }
  return res.json();
}

async function buildIndex(): Promise<Chunk[]> {
  const manifest = await fetchManifest();
  const cache = loadCache();
  const chunks: Chunk[] = [];
  const pending: Array<{ key: string; doc: KnowledgeDoc; text: string }> = [];

  for (const doc of manifest.documents) {
    const res = await fetch(`/knowledge/${doc.path}`);
    if (!res.ok) continue;
    const raw = await res.text();

    chunkMarkdown(raw).forEach((text, i) => {
      const key = `${doc.path}#${i}`;
      const cached = cache[key];
      if (cached && cached.text === text) {
        chunks.push({
          id: key,
          docPath: doc.path,
          title: doc.title,
          sourceUrl: doc.sourceUrl,
          domain: doc.domain,
          text,
          embedding: cached.embedding,
        });
      } else {
        pending.push({ key, doc, text });
      }
    });
  }

  for (let i = 0; i < pending.length; i += EMBED_BATCH_SIZE) {
    const batch = pending.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embed(batch.map((p) => p.text));
    batch.forEach((p, j) => {
      const embedding = embeddings[j];
      cache[p.key] = { text: p.text, embedding };
      chunks.push({
        id: p.key,
        docPath: p.doc.path,
        title: p.doc.title,
        sourceUrl: p.doc.sourceUrl,
        domain: p.doc.domain,
        text: p.text,
        embedding,
      });
    });
  }

  if (pending.length > 0) saveCache(cache);
  return chunks;
}

/** 懒加载 + 内存缓存的语料索引；首次调用会触发全量分块 + embedding（未命中缓存的部分）。 */
export async function getIndex(): Promise<Chunk[]> {
  if (!indexPromise) {
    indexPromise = buildIndex().catch((err) => {
      indexPromise = null;
      throw err;
    });
  }
  return indexPromise;
}

export async function search(query: string, topK = 5): Promise<SearchResult[]> {
  const index = await getIndex();
  const [queryEmbedding] = await embed([query]);
  return index
    .map((chunk) => ({ ...chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export interface TrainingWeek {
  period: string;
  mentor: string;
  items: string[];
}

export interface TrainingPlan {
  source_url: string;
  owner: string;
  overall_goal: { period: string; targets: string[] };
  weekly_plan: TrainingWeek[];
  current_focus: { note: string; period: string; items: string[]; related_docs: string[] };
}

export interface ChatDigestEntry {
  topic: string;
  summary: string;
  related_docs: string[];
}

export interface ChatDigest {
  generated_note: string;
  source_chats: string[];
  digest: ChatDigestEntry[];
}

export async function loadTrainingPlan(): Promise<TrainingPlan> {
  const res = await fetch("/knowledge/personal/fly/plan.json");
  if (!res.ok) throw new Error("无法加载培训计划数据");
  return res.json();
}

export async function loadChatDigest(): Promise<ChatDigest> {
  const res = await fetch("/knowledge/personal/fly/chat-digest.json");
  if (!res.ok) throw new Error("无法加载群聊摘要数据");
  return res.json();
}
