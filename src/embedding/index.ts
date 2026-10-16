import { embedChunks } from "./client.ts";

const inputPath = "./data/processed/chunks/siyar-alam-nubala.jsonl";
const outputPath = "./data/processed/embeddings/siyar-alam-nubala.jsonl";

await embedChunks(inputPath, outputPath);
