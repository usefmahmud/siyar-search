import { AutoTokenizer } from "@huggingface/transformers";
import type { PreTrainedTokenizer } from "@huggingface/transformers";

export const TOKENIZER_MODEL = "onnx-community/embeddinggemma-300m-ONNX";

export function resolveTokenizerModel(): string {
  return TOKENIZER_MODEL;
}

let tokenizerPromise: Promise<PreTrainedTokenizer> | null = null;

export function getTokenizer(): Promise<PreTrainedTokenizer> {
  if (!tokenizerPromise) {
    tokenizerPromise = AutoTokenizer.from_pretrained(
      resolveTokenizerModel(),
    ) as Promise<PreTrainedTokenizer>;
  }
  return tokenizerPromise;
}

export async function countTokensForSentences(
  sentences: string[],
): Promise<number[]> {
  const tokenizer = await getTokenizer();
  return sentences.map((s) => (s.trim() ? tokenizer.encode(s).length : 0));
}
