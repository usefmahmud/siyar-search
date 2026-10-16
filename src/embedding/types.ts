import type { Embedding } from "../chunking/types.ts";

export type ChunkEmbeddingRecord = {
  id: string;
  book_id: string;
  paragraph_id: string;
  paragraph_index: number;
  chunk_index: number;
  embedding: Embedding;
};
