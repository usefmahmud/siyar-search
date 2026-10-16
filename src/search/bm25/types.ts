import type { ChunkRecord } from "../../chunking/types.ts";

export const K1_DEFAULT = 1.5;
export const B_DEFAULT = 0.75;

export type Bm25Index = {
  chunks: ChunkRecord[];
  docTokens: string[][];
  docLengths: number[];
  avgDocLength: number;
  docFreq: Map<string, number>;
  k1: number;
  b: number;
};

export type Bm25Hit = {
  chunk: ChunkRecord;
  score: number;
  rank: number;
};
