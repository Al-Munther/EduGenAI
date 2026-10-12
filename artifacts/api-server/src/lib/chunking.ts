export interface Chunk {
  content: string;
  index: number;
  charStart: number;
  charEnd: number;
  pageNumber?: number;
  sourceFilename?: string;
}

export interface PageInfo {
  text: string;
  pageNumber: number;
}

const DEFAULT_CHUNK_SIZE = 1500;
const DEFAULT_OVERLAP = 250;
const MAX_CHUNKS = Math.max(1, parseInt(process.env.MAX_CHUNKS_FOR_DEMO || "200", 10) || 200);

export function chunkText(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
): Chunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const textLen = text.length;
  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  if (textLen <= chunkSize) {
    const content = text.trim();
    if (content.length > 0) {
      chunks.push({ content, index: 0, charStart: 0, charEnd: textLen });
    }
    return chunks;
  }

  while (start < textLen && chunks.length < MAX_CHUNKS) {
    let end = start + chunkSize;

    if (end >= textLen) {
      end = textLen;
    } else {
      const nextNewline = text.lastIndexOf("\n", end);
      const nextPeriod = text.lastIndexOf(". ", end);
      const nextSpace = text.lastIndexOf(" ", end);

      const breakAt = Math.max(nextNewline, nextPeriod, nextSpace);
      if (breakAt > start && breakAt <= end) {
        end = breakAt + 1;
      }
    }

    if (end <= start) {
      end = Math.min(start + chunkSize, textLen);
    }

    const content = text.slice(start, end).trim();
    if (content.length > 0) {
      chunks.push({
        content,
        index,
        charStart: start,
        charEnd: end,
      });
      index++;
    }

    const nextStart = end - overlap;
    if (nextStart > start) {
      start = nextStart;
    } else {
      start = end;
    }
    if (start >= textLen) break;
    if (start < 0) start = 0;
  }

  return chunks;
}

export function chunkTextWithPages(
  pages: PageInfo[],
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP,
): Chunk[] {
  if (pages.length === 0) return [];

  let accumulated = 0;
  const pageMarkers: Array<{ offset: number; pageNumber: number }> = [];

  for (const page of pages) {
    pageMarkers.push({ offset: accumulated, pageNumber: page.pageNumber });
    accumulated += page.text.length + 1;
  }

  const fullText = pages.map((p) => p.text).join("\n");
  const rawChunks = chunkText(fullText, chunkSize, overlap);

  return rawChunks.map((chunk) => {
    let pageNumber: number | undefined;
    for (let i = pageMarkers.length - 1; i >= 0; i--) {
      if (chunk.charStart >= pageMarkers[i].offset) {
        pageNumber = pageMarkers[i].pageNumber;
        break;
      }
    }

    return { ...chunk, pageNumber };
  });
}

export function cleanText(text: string): string {
  let cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t+/g, " ")
    .replace(/\f/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  const lines = cleaned.split("\n");
  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed.length <= 1) return false;
    if (/^\d+\s*$/.test(trimmed)) return false;
    if (/^(page|p\.?)\s*\d+$/i.test(trimmed)) return false;
    if (/^references|bibliography|appendix|acknowledgements/i.test(trimmed) && trimmed.split(/\s+/).length <= 3) return false;
    return true;
  });

  cleaned = filteredLines.join("\n");

  cleaned = cleaned
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[•●▪➢→⇒]/g, "-")
    .trim();

  return cleaned;
}

export interface ChunkFilterReason {
  index: number;
  content: string;
  reason: string;
}

export function filterChunks(chunks: Chunk[]): { kept: Chunk[]; rejected: ChunkFilterReason[] } {
  const kept: Chunk[] = [];
  const rejected: ChunkFilterReason[] = [];

  for (const chunk of chunks) {
    const content = chunk.content.trim();
    const words = content.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const avgWordLength = wordCount > 0 ? words.reduce((s, w) => s + w.length, 0) / wordCount : 0;
    const charCount = content.length;

    let reason: string | null = null;

    if (charCount < 30) {
      reason = `too short (${charCount} chars)`;
    } else if (wordCount < 5) {
      reason = `too few words (${wordCount})`;
    } else if (avgWordLength > 15) {
      reason = `avg word length ${avgWordLength.toFixed(1)} > 15 (merged words likely)`;
    } else if (wordCount > 0 && charCount / wordCount < 2) {
      reason = `avg char per word too low (${(charCount / wordCount).toFixed(1)})`;
    } else if (isReferenceSection(content)) {
      reason = `references/bibliography section`;
    } else if (isCitationHeavy(content)) {
      reason = `dominated by citations`;
    } else if (isMostlyPunctuation(content)) {
      reason = `mostly punctuation/symbols`;
    }

    if (reason) {
      rejected.push({ index: chunk.index, content: content.substring(0, 150), reason });
      console.log(`[ChunkFilter] REJECTED chunk ${chunk.index}: ${reason}`);
      console.log(`[ChunkFilter]   preview: "${content.substring(0, 120).replace(/\n/g, "\\n")}"`);
    } else {
      kept.push(chunk);
    }
  }

  if (rejected.length > 0) {
    console.log(`[ChunkFilter] Kept ${kept.length}/${chunks.length} chunks, rejected ${rejected.length}`);
  }

  return { kept, rejected };
}

function isReferenceSection(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (/^(references|bibliography|works cited|further reading|suggested readings?|index)/i.test(lower)) {
    return true;
  }

  const lines = text.split("\n").filter(Boolean);
  const citationLines = lines.filter((l) => /\(\d{4}\)|\[\d+\]|,\s+(?:Journal|Conference|Proceedings|Press|University)/i.test(l));
  return lines.length > 0 && citationLines.length / lines.length > 0.5;
}

function isCitationHeavy(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 10) return false;

  const citationPatterns = [
    /\(\d{4}\)/, /\b(?:et\s+al\.?)\b/, /\[\d+\]/, /\b(?:Vol\.|No\.|pp?\.)\s*\d+/,
    /,\s*(?:Journal|Conference|Proceedings|Press|University|Review|Research|Letters)/i,
  ];

  const matchCount = citationPatterns.reduce((sum, p) => {
    const matches = text.match(p);
    return sum + (matches ? matches.length : 0);
  }, 0);

  return matchCount > words.length * 0.2;
}

function isMostlyPunctuation(text: string): boolean {
  const nonAlpha = text.replace(/[a-zA-Z\s]/g, "").length;
  return text.length > 0 && nonAlpha / text.length > 0.4;
}

export function fixMergedWords(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]{2,})([a-z]{2,})/g, "$1 $2")
    .replace(/([a-z]{2,})([A-Z]{2,})/g, "$1 $2");
}

export function getTextPreview(text: string, maxChars = 200): string {
  return text.substring(0, maxChars).replace(/\s+/g, " ").trim();
}
