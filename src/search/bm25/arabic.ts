export const normalizeArabic = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const PREFIXES = ["وال", "بال", "كال", "فال", "لل", "ال"];

export function stripPrefix(w: string): string {
  for (const p of PREFIXES) {
    if (w.startsWith(p) && w.length - p.length >= 3) return w.slice(p.length);
  }
  if (w.startsWith("و") && w.length >= 5) return w.slice(1);
  return w;
}

export const tokenizeArabic = (text: string): string[] => {
  return normalizeArabic(text).split(" ").filter(Boolean).map(stripPrefix);
};
