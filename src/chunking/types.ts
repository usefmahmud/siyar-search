export type Embedding = number[];

export type Sentence = {
  id: number;
  text: string;
};

export type Chunk = {
  startSentence: number;
  endSentence: number;
  text: string;
  tokenCount: number;
};

export type ChunkOptions = {
  minTokens: number;
  targetTokens: number;
  maxTokens: number;
  similarityThreshold: number;
};

export type ParagraphRecord = {
  id: string;
  book_id: string;
  paragraph_index: number;
  title: string;
  text: string;
  normalized_text: string;
  sentences: string[];
};

export type ChunkRecord = Chunk & {
  id: string;
  book_id: string;
  paragraph_id: string;
  paragraph_index: number;
  title: string;
  chunk_index: number;
};
