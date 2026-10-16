import OpenAI from "openai";
import type { Embedding, Sentence } from "./types.ts";

export type EmbeddingClientOptions = {
  baseURL?: string;
  apiKey?: string;
  model?: string;
  batchSize?: number;
};

export function resolveEmbeddingConfig() {
  const baseURL = process.env["EMBEDDING_BASE_URL"];
  const apiKey = process.env["EMBEDDING_API_KEY"];
  const model = process.env["EMBEDDING_MODEL"];
  const batchSize = process.env["EMBEDDING_BATCH_SIZE"];

  if (!model) {
    throw new Error(
      "embedding model is not set. Provide EMBEDDING_MODEL env variable.",
    );
  }
  return { baseURL, apiKey, model, batchSize: Number(batchSize) };
}

export function createEmbeddingClient() {
  const { baseURL, apiKey } = resolveEmbeddingConfig();
  return new OpenAI({ baseURL, apiKey });
}

export async function embedSentences(
  sentences: Sentence[],
): Promise<Embedding[]> {
  if (sentences.length === 0) return [];
  const { model, batchSize } = resolveEmbeddingConfig();
  const api = createEmbeddingClient();

  const out: Embedding[] = [];
  for (let i = 0; i < sentences.length; i += batchSize) {
    const batch = sentences.slice(i, i + batchSize);

    const res = await api.embeddings.create({
      model,
      input: batch.map((s) => s.text),
    });

    const sorted = [...res.data].sort((a, b) => a.index - b.index);

    for (const row of sorted) out.push(row.embedding as Embedding);
  }

  if (out.length !== sentences.length) {
    throw new Error(
      `embedding count mismatch: got ${out.length}, expected ${sentences.length}`,
    );
  }
  return out;
}
