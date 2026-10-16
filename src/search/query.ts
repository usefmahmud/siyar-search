import { buildBm25Index, searchBm25 } from "./bm25/index.ts";
import { loadChunksFromJsonl } from "./bm25/loader.ts";

const queries: string[] = [
  "أمين الأمة",
  "سيف الله",
  "ترجمان القرآن",
  "أقرأ الأمة",
  "أصدق الأمة لهجة",
  "أعلمهم بالحلال والحرام",
  "أرحم أمتي بأمتي",
  "أفرضهم زيد بن ثابت",
  "خالد بن الوليد",
  "أبو عبيدة بن الجراح",
  "عبد الله بن عباس",
  "عمر بن الخطاب",
  "بلال بن رباح",
  "سعيد بن المسيب",
  "وفاة أبي عبيدة في طاعون عمواس",
  "غزوة مؤتة",
  "هجرة النبي إلى المدينة",
  "رواية الحديث عن أنس بن مالك",
  "من شهد بدرا من الصحابة",
  "الصحابة الذين رووا عن رسول الله",
];

const chunksPath = "./data/processed/chunks/siyar-alam-nubala.jsonl";
const topK = 5;

const chunks = await loadChunksFromJsonl(chunksPath);
const index = buildBm25Index(chunks);

for (const q of queries) {
  const hits = searchBm25(index, q, topK);

  console.log(`docs=${chunks.length} query="${q}" hits=${hits.length}`);
  for (const h of hits) {
    console.log(
      `\n[rank=${h.rank} score=${h.score.toFixed(4)} id=${h.chunk.id}]`,
    );
    console.log(`title: ${h.chunk.title}`);
    console.log(h.chunk.text.slice(0, 300));
  }
}
