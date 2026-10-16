import type { Embedding } from "./types.ts";

export function cosineSimilarity(a: Embedding, b: Embedding): number {
  if (a.length !== b.length || a.length === 0) {
    throw new Error("embeddings must have the same non-zero dimension");
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    normA += x ** 2;
    normB += y ** 2;
  }

  if (normA === 0 || normB === 0) {
    throw new Error("embedding vectors must not be zero vectors");
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function pairwiseSimilarities(embeddings: Embedding[]): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < embeddings.length; i++) {
    out.push(cosineSimilarity(embeddings[i]!, embeddings[i + 1]!));
  }
  return out;
}
