import pdfParse from "pdf-parse";
import { logger } from "./logger";

export interface ExtractedPage {
  text: string;
  pageNumber: number;
}

export interface ExtractionResult {
  pages: ExtractedPage[];
  totalChars: number;
  totalPages: number;
  quality: ExtractionQuality;
}

export interface ExtractionQuality {
  pass: boolean;
  totalChars: number;
  wordCount: number;
  avgWordLength: number;
  linesWithSpacesRatio: number;
  highQualityChunks: number;
  message: string;
}

function estimateFontHeight(item: { transform: number[]; width: number; height?: number }): number {
  return Math.abs(item.transform[3]) || item.height || 12;
}

function buildPageText(items: Array<{ str: string; transform: number[]; width: number; height?: number }>): string {
  if (!items || items.length === 0) return "";

  let result = "";
  let lastY: number | null = null;
  let lastXEnd: number | null = null;
  let lastFontHeight: number = 12;

  for (const item of items) {
    const str = item.str;
    if (!str) continue;

    const x = item.transform[4];
    const y = item.transform[5];
    const w = item.width;
    const fontH = estimateFontHeight(item);

    if (lastY === null) {
      result += str;
    } else if (Math.abs(y - lastY) > fontH * 0.5) {
      result += "\n" + str;
    } else {
      const gap = x - (lastXEnd ?? x);
      const spaceThreshold = fontH * 0.15;
      if (gap > spaceThreshold && str !== "." && str !== "," && str !== ";" && str !== ":") {
        result += " " + str;
      } else {
        result += str;
      }
    }

    lastY = y;
    lastXEnd = x + w;
    lastFontHeight = fontH;
  }

  return result;
}

function customPageRender(pageData: any): Promise<string> {
  const renderOptions = {
    normalizeWhitespace: true,
    disableCombineTextItems: false,
  };

  return pageData.getTextContent(renderOptions).then((textContent: any) => {
    const items: Array<{ str: string; transform: number[]; width: number; height?: number }> = textContent.items || [];
    return buildPageText(items);
  });
}

export async function extractPages(buffer: Buffer): Promise<ExtractionResult> {
  const options = {
    pagerender: customPageRender,
    max: 0,
  };

  const pdfData = await pdfParse(buffer, options);

  const pageTexts = pdfData.text.split("\n\n").filter(Boolean);
  const rawPages: Array<{ text: string; pageNumber: number }> = [];

  for (let i = 0; i < pdfData.numpages; i++) {
    rawPages.push({
      text: pageTexts[i] || "",
      pageNumber: i + 1,
    });
  }

  const result = rawPages.length > 0 ? rawPages : [{ text: pdfData.text || "", pageNumber: 1 }];

  const totalText = result.map((p) => p.text).join("\n");
  const totalChars = totalText.length;

  logger.info({
    totalPages: pdfData.numpages,
    totalChars,
    pagesWithText: result.filter((p) => p.text.trim().length > 0).length,
  }, "PDF pages extracted");

  const quality = assessExtractionQuality(result);

  return {
    pages: result,
    totalChars,
    totalPages: pdfData.numpages,
    quality,
  };
}

export function isScannedPdf(pages: ExtractedPage[]): boolean {
  if (pages.length === 0) return true;

  const pagesWithContent = pages.filter((p) => p.text.trim().length > 20);
  const ratio = pagesWithContent.length / pages.length;

  const totalChars = pages.reduce((s, p) => s + p.text.trim().length, 0);
  const avgCharsPerPage = totalChars / Math.max(pages.length, 1);

  return ratio < 0.3 || avgCharsPerPage < 30;
}

export function assessExtractionQuality(pages: ExtractedPage[]): ExtractionQuality {
  const fullText = pages.map((p) => p.text).join("\n");
  const words = fullText.split(/\s+/).filter(Boolean);
  const lines = fullText.split("\n").filter(Boolean);
  const wordCount = words.length;
  const totalChars = fullText.length;
  const avgWordLength = wordCount > 0 ? words.reduce((s, w) => s + w.length, 0) / wordCount : 0;

  const linesWithSpaces = lines.filter((l) => l.includes(" ")).length;
  const linesWithSpacesRatio = lines.length > 0 ? linesWithSpaces / lines.length : 0;

  const paragraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim().length > 50);
  const highQualityChunks = paragraphs.length;

  const failures: string[] = [];

  if (totalChars < 100) {
    failures.push(`Very low text length: ${totalChars} chars`);
  }
  if (wordCount < 20) {
    failures.push(`Very low word count: ${wordCount} words`);
  }
  if (avgWordLength > 20) {
    failures.push(`Average word length too high (${avgWordLength.toFixed(1)}): words may be merged`);
  }
  if (linesWithSpacesRatio < 0.3 && lines.length > 5) {
    failures.push(`Low ratio of lines with spaces (${(linesWithSpacesRatio * 100).toFixed(0)}%): text may be broken`);
  }
  if (highQualityChunks === 0 && totalChars > 50) {
    failures.push(`No coherent paragraphs found despite ${totalChars} chars`);
  }

  const scanned = isScannedPdf(pages);
  if (scanned) {
    failures.push("PDF appears to be scanned/image-based — no selectable text found");
  }

  const message = failures.length > 0
    ? `The PDF text could not be extracted cleanly. ${failures.join("; ")}. Please upload a text-based PDF or enable OCR support.`
    : "Extraction quality acceptable";

  return {
    pass: failures.length === 0,
    totalChars,
    wordCount,
    avgWordLength,
    linesWithSpacesRatio,
    highQualityChunks,
    message,
  };
}
