import { tokenizeArabic } from "./arabic.ts";
import type { Bm25Hit, Bm25Index } from "./types.ts";

const IDF = (N: number, DF: number): number => {
  return Math.log(1 + (N - DF + 0.5) / (DF + 0.5));
};

export const searchBm25 = (
  index: Bm25Index,
  query: string,
  topK = 10,
): Bm25Hit[] => {
  const queryTokens = tokenizeArabic(query);
  if (queryTokens.length === 0 || index.chunks.length === 0) return [];

  const N = index.chunks.length;
  const scored: { idx: number; score: number }[] = [];

  for (let d = 0; d < N; d++) {
    const tokens = index.docTokens[d];
    if (!tokens || tokens.length === 0) continue;

    const TF = new Map<string, number>();
    for (const t of tokens) TF.set(t, (TF.get(t) ?? 0) + 1);

    let score = 0;
    for (const term of new Set(queryTokens)) {
      const f = TF.get(term) ?? 0;
      if (f === 0) continue;

      const DF = index.docFreq.get(term) ?? 0;
      if (DF === 0) continue;

      const docLen = index.docLengths[d];
      if (!docLen) continue;

      const norm =
        (f * (index.k1 + 1)) /
        (f +
          index.k1 *
            (1 -
              index.b +
              (index.b * docLen) / Math.max(index.avgDocLength, 1)));
      score += IDF(N, DF) * norm;
    }

    if (score > 0) scored.push({ idx: d, score });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, Math.max(0, topK)).map((s, i) => ({
    chunk: index.chunks[s.idx]!,
    score: s.score,
    rank: i + 1,
  }));
};
