import { logger } from "./logger";

export interface SafeParseResult<T> {
  success: true;
  data: T;
}

export interface SafeParseError {
  success: false;
  error: string;
  raw: string;
}

export type SafeParseOutcome<T> = SafeParseResult<T> | SafeParseError;

export function safeJsonParse<T>(text: string, label = "AI"): SafeParseOutcome<T> {
  let candidate = text.trim();

  const codeBlockMatch = candidate.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    candidate = codeBlockMatch[1].trim();
  }

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const firstBracket = candidate.indexOf("[");
  const lastBracket = candidate.lastIndexOf("]");

  const objectMode = firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket);

  const startIdx = objectMode ? firstBrace : firstBracket;
  const endIdx = objectMode ? lastBrace : lastBracket;

  if (startIdx === -1 || endIdx === -1) {
    logger.error({ raw: text.substring(0, 300) }, `${label}: No JSON structure found`);
    return { success: false, error: "No JSON structure found in response", raw: text.substring(0, 500) };
  }

  candidate = candidate.substring(startIdx, endIdx + 1);

  candidate = candidate.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
  candidate = candidate.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  try {
    return { success: true, data: JSON.parse(candidate) as T };
  } catch (firstErr) {
    logger.warn({ error: String(firstErr), preview: candidate.substring(0, 200) }, `${label}: JSON parse failed, attempting repair`);

    const repaired = candidate
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");

    try {
      return { success: true, data: JSON.parse(repaired) as T };
    } catch {
      logger.error({ error: String(firstErr), raw: text.substring(0, 500) }, `${label}: JSON parse failed after repair`);
      return {
        success: false,
        error: firstErr instanceof Error ? firstErr.message : "Failed to parse JSON",
        raw: text.substring(0, 500),
      };
    }
  }
}

export function generateFallbackUnits(
  chunks: Array<{ content: string }>,
  count: number,
  courseTitle?: string,
): Array<{ title: string; description: string; content: string; objectives: string[] }> {
  const units: Array<{ title: string; description: string; content: string; objectives: string[] }> = [];
  const chunksPerUnit = Math.max(Math.ceil(chunks.length / count), 1);

  for (let i = 0; i < count; i++) {
    const start = i * chunksPerUnit;
    const end = Math.min(start + chunksPerUnit, chunks.length);
    const unitChunks = chunks.slice(start, end);
    const content = unitChunks.map((c) => c.content).join("\n\n");

    const firstLine = content.split("\n").find(l => {
      const t = l.trim();
      return t.length > 20 && t.length < 200 && !t.endsWith(".");
    }) || "";
    const title = firstLine || `${courseTitle || "Course"} — Part ${i + 1}`;

    const sentences = content.match(/[^.!?\n]+[.!?]/g) || [];
    const description = sentences.slice(0, 2).join(" ").trim()
      || `Based on section ${i + 1} of the course material.`;

    const objectives = [
      `Understand the key concepts covered in this section`,
      `Apply the knowledge from the course material`,
      `Analyze the content critically`,
    ];

    units.push({
      title: title.substring(0, 150),
      description: description.substring(0, 300),
      content,
      objectives,
    });
  }

  return units;
}
