import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { once } from "node:events";

const inputPath = "./data/books/siyar-alam-nubala.txt";
const outputPath = "./data/processed/paragraphs/siyar-alam-nubala.jsonl";
const bookId = "siyar-alam-nubala";

await mkdir(dirname(outputPath), { recursive: true });

const cleanText = (line: string): string => {
  return line
    .replaceAll("$", "")
    .replaceAll("#", "")
    .replaceAll("*", "")
    .replaceAll("~", "")
    .replaceAll(/ms\d+/g, "")
    .replaceAll(/\(\d+\)/g, "")
    .replaceAll(/  \d+ -/g, "")
    .trim();
};

const normalizeText = (text: string): string => {
  return text
    .replaceAll(/[\u064B-\u065F\u0670]/g, "")
    .replaceAll(/\u0640/g, "")
    .trim()
    .replaceAll(/[ \t]+/g, " ");
};

interface Paragraph {
  title: string;
  text: string;
}

async function* parseParagraphs(filePath: string): AsyncGenerator<Paragraph> {
  const stream = createReadStream(filePath, {
    encoding: "utf8",
  });

  const lines = createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  let paragraph: string[] = [];

  for await (const line of lines) {
    if (line.startsWith("### $")) {
      if (paragraph.length > 0) {
        yield {
          title: paragraph[0] || "Untitled",
          text: paragraph.slice(1).join(" "),
        };
      }

      paragraph = [cleanText(line)];
    } else if (paragraph.length > 0) {
      paragraph.push(cleanText(line));
    }
  }

  if (paragraph.length > 0) {
    yield {
      title: paragraph[0] || "Untitled",
      text: paragraph.slice(1).join(" "),
    };
  }
}

const output = createWriteStream(outputPath, {
  encoding: "utf8",
});

let index = 0;

try {
  for await (const paragraph of parseParagraphs(inputPath)) {
    index++;

    const normalizedText = normalizeText(paragraph.text);

    const record = {
      id: `${bookId}:para:${String(index).padStart(6, "0")}`,
      book_id: bookId,
      paragraph_index: index,
      title: paragraph.title,
      text: paragraph.text,
      normalized_text: normalizedText,
      sentences: normalizedText
        .split(".")
        .map((sentence) => sentence.trim())
        .filter(Boolean),
    };

    if (!output.write(`${JSON.stringify(record)}\n`)) {
      await once(output, "drain");
    }

    if (index % 100 === 0) {
      console.log(`processed ${index} paragraphs`);
    }
  }

  output.end();
  await once(output, "finish");

  console.log(`finished, ${index} paragraphs saved to ${outputPath}`);
} catch (error) {
  output.destroy();
  throw error;
}
