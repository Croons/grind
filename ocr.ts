import { ORIGINS, VARIETIES, PROCESSES } from "./data.js";

// Tesseract.js is loaded globally via a script tag in index.html.
declare const Tesseract: any;

export interface ScanMatch {
  origin: string | null;
  variety: string | null;
  process: string | null;
  rawText: string;
}

function findNameInText(text: string, names: string[]): string | null {
  const lower = text.toLowerCase();
  for (const name of names) {
    if (lower.includes(name.toLowerCase())) return name;
  }
  return null;
}

export async function scanBagImage(
  file: File,
  onProgress: (status: string) => void
): Promise<ScanMatch> {
  const result = await Tesseract.recognize(file, "eng", {
    logger: (m: { status: string; progress: number }) => {
      if (m.status) onProgress(`${m.status} ${Math.round((m.progress || 0) * 100)}%`);
    },
  });

  const text: string = result?.data?.text ?? "";

  const origin = findNameInText(text, ORIGINS.map((o) => o.name));
  const variety = findNameInText(text, VARIETIES.map((v) => v.name));
  const process = findNameInText(
    text,
    PROCESSES.filter((p) => p.value !== "other").map((p) => p.label)
  );

  return {
    origin,
    variety,
    process: process ? process.toLowerCase().replace(/\s+/g, "-") : null,
    rawText: text,
  };
}
