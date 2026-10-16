import type { ChunkRecord } from "../../chunking/types.ts";
import { tokenizeArabic } from "./arabic.ts";
import { B_DEFAULT, K1_DEFAULT, type Bm25Index } from "./types.ts";

export const buildBm25Index = (chunks: ChunkRecord[]): Bm25Index => {
  const docTokens = chunks.map((c) => tokenizeArabic(`${c.title} ${c.text}`));

  const docLengths = docTokens.map((t) => t.length);

  const avgDocLength =
    docLengths.length === 0
      ? 0
      : docLengths.reduce((a, n) => a + n, 0) / docLengths.length;

  const docFreq = new Map<string, number>();
  for (const tokens of docTokens) {
    for (const term of new Set(tokens)) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
  }

  return {
    chunks,
    docTokens,
    docLengths,
    avgDocLength,
    docFreq,
    k1: K1_DEFAULT,
    b: B_DEFAULT,
  };
};
