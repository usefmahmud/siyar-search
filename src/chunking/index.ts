import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { once } from "node:events";
import { buildChunks } from "./chunker.ts";
import { embedSentences } from "../embedding/client.ts";
import { countTokensForSentences } from "./tokenizer.ts";
import type {
  ChunkOptions,
  ChunkRecord,
  ParagraphRecord,
  Sentence,
} from "./types.ts";

const inputPath = "./data/processed/paragraphs/siyar-alam-nubala.jsonl";
const outputPath = "./data/processed/chunks/siyar-alam-nubala.jsonl";

const options: ChunkOptions = {
  minTokens: 60,
  targetTokens: 120,
  maxTokens: 180,
  similarityThreshold: 0.55,
};

const limit = 0;
const LOG_EVERY = 1; // log one line per paragraph so resume position is visible
const RATE_EVERY = 50; // extra throughput/ETA summary cadence

await mkdir(dirname(outputPath), { recursive: true });

console.log(
  `[chunk] start input=${inputPath} output=${outputPath} ` +
    `minTokens=${options.minTokens} targetTokens=${options.targetTokens} ` +
    `maxTokens=${options.maxTokens} similarityThreshold=${options.similarityThreshold} ` +
    `limit=${limit === 0 ? "all" : limit}`,
);

const output = createWriteStream(outputPath, { encoding: "utf8" });
let paragraphs = 0;
let chunksWritten = 0;
let current: ParagraphRecord | null = null;
const startedAt = performance.now();
const fmtTitle = (title: string, max = 40) =>
  title.length > max ? `${title.slice(0, max)}…` : title;

try {
  const stream = createReadStream(inputPath, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const record = JSON.parse(trimmed) as ParagraphRecord;
    if (!record.sentences || record.sentences.length === 0) continue;
    current = record;

    paragraphs++;
    const paraStartedAt = performance.now();
    const sentences: Sentence[] = record.sentences.map((text, idx) => ({
      id: idx,
      text,
    }));
    const tokenizedAt = performance.now();
    const tokenCounts = await countTokensForSentences(record.sentences);
    const embeddedAt = performance.now();
    const embeddings = await embedSentences(sentences);
    const chunkedAt = performance.now();
    const chunks = buildChunks(sentences, embeddings, tokenCounts, options);
    const tokenTotal = tokenCounts.reduce((sum, n) => sum + n, 0);

    let chunkIndex = 0;
    for (const chunk of chunks) {
      chunkIndex++;
      const out: ChunkRecord = {
        ...chunk,
        id: `${record.id}:chunk:${String(chunkIndex).padStart(4, "0")}`,
        book_id: record.book_id,
        paragraph_id: record.id,
        paragraph_index: record.paragraph_index,
        title: record.title,
        chunk_index: chunkIndex,
      };
      if (!output.write(`${JSON.stringify(out)}\n`)) {
        await once(output, "drain");
      }
      chunksWritten++;
    }

    if (paragraphs % LOG_EVERY === 0) {
      const paraMs = Math.round(performance.now() - paraStartedAt);
      console.log(
        `[chunk ${paragraphs}] paragraph_index=${record.paragraph_index} ` +
          `id=${record.id} title="${fmtTitle(record.title)}" ` +
          `sentences=${sentences.length} tokens=${tokenTotal} chunks=${chunks.length} ` +
          `tok=${Math.round(embeddedAt - tokenizedAt)}ms ` +
          `emb=${Math.round(chunkedAt - embeddedAt)}ms ` +
          `chunk=${Math.round(performance.now() - chunkedAt)}ms ` +
          `total=${paraMs}ms (paragraphs=${paragraphs} chunks=${chunksWritten})`,
      );
    }
    if (paragraphs % RATE_EVERY === 0) {
      const elapsedSec = (performance.now() - startedAt) / 1000;
      const rate = paragraphs / Math.max(elapsedSec, 0.001);
      console.log(
        `[chunk] progress paragraphs=${paragraphs} chunks=${chunksWritten} ` +
          `elapsed=${elapsedSec.toFixed(1)}s rate=${rate.toFixed(1)}/s`,
      );
    }
    if (limit > 0 && paragraphs >= limit) break;
  }

  output.end();
  await once(output, "finish");
  const totalSec = (performance.now() - startedAt) / 1000;
  console.log(
    `[chunk] finished chunks=${chunksWritten} paragraphs=${paragraphs} ` +
      `elapsed=${totalSec.toFixed(1)}s -> ${outputPath}`,
  );
} catch (error) {
  if (current) {
    console.error(
      `[chunk] failed at paragraphs=${paragraphs} ` +
        `paragraph_index=${current.paragraph_index} id=${current.id} ` +
        `title="${fmtTitle(current.title)}"`,
    );
  }
  output.destroy();
  throw error;
}
