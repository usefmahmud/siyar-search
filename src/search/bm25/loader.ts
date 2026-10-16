import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { ChunkRecord } from "../../chunking/types.ts";

export async function loadChunksFromJsonl(
  path: string,
  limit = 0,
): Promise<ChunkRecord[]> {
  const chunks: ChunkRecord[] = [];
  const stream = createReadStream(path, { encoding: "utf8" });

  for await (const line of createInterface({
    input: stream,
    crlfDelay: Infinity,
  })) {
    if (!line.trim()) continue;

    chunks.push(JSON.parse(line) as ChunkRecord);
    if (limit > 0 && chunks.length >= limit) break;
  }
  return chunks;
}
