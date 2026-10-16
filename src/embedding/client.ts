import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { once } from "node:events";
import OpenAI from "openai";
import type { ChunkEmbeddingRecord } from "./types.ts";
import type { ChunkRecord, Embedding, Sentence } from "../chunking/types.ts";

let api: OpenAI | null = null;

export async function embedSentences(
  sentences: Sentence[],
): Promise<Embedding[]> {
  if (sentences.length === 0) return [];

  const model = process.env["EMBEDDING_MODEL"];
  if (!model) {
    throw new Error(
      "embedding model is not set. Provide EMBEDDING_MODEL env variable.",
    );
  }
  const batchSize = Number(process.env["EMBEDDING_BATCH_SIZE"] ?? 64);
  api ??= new OpenAI({
    baseURL: process.env["EMBEDDING_BASE_URL"],
    apiKey: process.env["EMBEDDING_API_KEY"],
  });

  const out: Embedding[] = [];
  for (let i = 0; i < sentences.length; i += batchSize) {
    const res = await api.embeddings.create({
      model,
      input: sentences.slice(i, i + batchSize).map((s) => s.text),
    });
    for (const row of [...res.data].sort((a, b) => a.index - b.index)) {
      out.push(row.embedding as Embedding);
    }
  }

  if (out.length !== sentences.length) {
    throw new Error(
      `embedding count mismatch: got ${out.length}, expected ${sentences.length}`,
    );
  }
  return out;
}

const PROCESS_BATCH_SIZE = 256;

export async function embedChunks(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });

  const output = createWriteStream(outputPath, { encoding: "utf8" });
  const startedAt = performance.now();
  let read = 0;
  let written = 0;
  let batch: ChunkRecord[] = [];

  const writeRecord = async (record: ChunkEmbeddingRecord): Promise<void> => {
    if (!output.write(`${JSON.stringify(record)}\n`)) {
      await once(output, "drain");
    }
  };

  const writeBatch = async (chunks: ChunkRecord[]): Promise<void> => {
    if (chunks.length === 0) return;

    const batchStartedAt = performance.now();
    const sentences: Sentence[] = chunks.map((chunk) => ({
      id: chunk.chunk_index,
      text: `العنوان: ${chunk.title}\nالنص: ${chunk.text}`,
    }));

    const embeddings = await embedSentences(sentences);
    if (embeddings.length !== chunks.length) {
      throw new Error(
        `embedding count mismatch in batch starting at ${written}: got ${embeddings.length}, expected ${chunks.length}`,
      );
    }

    for (let j = 0; j < chunks.length; j++) {
      const chunk = chunks[j]!;
      await writeRecord({
        id: chunk.id,
        book_id: chunk.book_id,
        paragraph_id: chunk.paragraph_id,
        paragraph_index: chunk.paragraph_index,
        chunk_index: chunk.chunk_index,
        embedding: embeddings[j]!,
      });
      written++;
    }

    const elapsedSec = (performance.now() - startedAt) / 1000;
    console.log(
      `[embed] progress written=${written} ` +
        `batchMs=${Math.round(performance.now() - batchStartedAt)}ms ` +
        `elapsed=${elapsedSec.toFixed(1)}s ` +
        `rate=${(written / Math.max(elapsedSec, 0.001)).toFixed(1)}/s`,
    );
  };

  try {
    const stream = createReadStream(inputPath, { encoding: "utf8" });
    const lines = createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      batch.push(JSON.parse(trimmed) as ChunkRecord);
      read++;

      if (batch.length >= PROCESS_BATCH_SIZE) {
        await writeBatch(batch);
        batch = [];
      }
    }

    await writeBatch(batch);

    output.end();
    await once(output, "finish");

    const totalSec = (performance.now() - startedAt) / 1000;
    console.log(
      `[embed] finished written=${written} read=${read} ` +
        `elapsed=${totalSec.toFixed(1)}s -> ${outputPath}`,
    );
  } catch (error) {
    console.error(`[embed] failed at written=${written}`);
    if (batch.length > 0) {
      console.error(
        `[embed] unembedded batch: ${batch.map((c) => c.id).join(", ")}`,
      );
    }
    output.destroy();
    throw error;
  }
}
