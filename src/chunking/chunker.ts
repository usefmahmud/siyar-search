import { cosineSimilarity } from "./similarity.ts";
import type { Chunk, ChunkOptions, Embedding, Sentence } from "./types.ts";

export function buildChunks(
  sentences: Sentence[],
  embeddings: Embedding[],
  tokenCounts: number[],
  options: ChunkOptions,
): Chunk[] {
  if (
    sentences.length !== embeddings.length ||
    sentences.length !== tokenCounts.length
  ) {
    throw new Error("input arrays must have equal lengths");
  }

  if (sentences.length === 0) return [];

  if (options.minTokens > options.targetTokens) {
    throw new Error("minTokens must be <= targetTokens");
  }
  if (options.targetTokens > options.maxTokens) {
    throw new Error("targetTokens must be <= maxTokens");
  }

  const chunks: Chunk[] = [];
  let start = 0;
  let tokens = 0;

  const makeChunk = (from: number, to: number): Chunk => ({
    startSentence: sentences[from]!.id,
    endSentence: sentences[to]!.id,
    text: sentences
      .slice(from, to + 1)
      .map((s) => s.text)
      .join(" "),
    tokenCount: tokenCounts.slice(from, to + 1).reduce((sum, n) => sum + n, 0),
  });

  const findFallbackSplit = (from: number, to: number): number => {
    let acc = 0;
    let best = -1;
    let bestSim = Infinity;

    for (let j = from; j <= to; j++) {
      acc += tokenCounts[j]!;
      if (acc < options.minTokens) continue;

      if (j >= to) break;

      const sim = cosineSimilarity(embeddings[j]!, embeddings[j + 1]!);
      if (sim < bestSim) {
        bestSim = sim;
        best = j;
      }
    }

    return best;
  };

  for (let i = 0; i < sentences.length; i++) {
    const sentenceTokens = tokenCounts[i]!;

    if (i === start && sentenceTokens > options.maxTokens) {
      chunks.push(makeChunk(i, i));
      start = i + 1;
      tokens = 0;
      continue;
    }

    if (i > start && tokens + sentenceTokens > options.maxTokens) {
      const fallback = findFallbackSplit(start, i - 1);
      const cut = fallback >= 0 ? fallback : i - 1;
      chunks.push(makeChunk(start, cut));

      start = cut + 1;
      tokens = tokenCounts.slice(start, i).reduce((sum, n) => sum + n, 0);
    }

    tokens += sentenceTokens;

    if (i === sentences.length - 1) {
      chunks.push(makeChunk(start, i));
      break;
    }

    const similarity = cosineSimilarity(embeddings[i]!, embeddings[i + 1]!);
    const canSplit = tokens >= options.minTokens;
    const reachedTarget = tokens >= options.targetTokens;
    const semanticBoundary = similarity < options.similarityThreshold;

    if (canSplit && reachedTarget && semanticBoundary) {
      chunks.push(makeChunk(start, i));
      start = i + 1;
      tokens = 0;
    }
  }

  return chunks;
}
