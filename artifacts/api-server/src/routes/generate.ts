import { Router, type IRouter } from "express";
import { db, coursesTable, courseUnitsTable, courseQuestionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { generateText } from "../lib/ollama";
import { retrieveRelevantChunks, getCourseChunkCount } from "../lib/rag";
import { buildUnitGenerationPrompt, buildQuestionGenerationPrompt, buildRegenerateUnitPrompt, buildRegenerateQuestionPrompt } from "../lib/prompt-templates";
import { safeJsonParse, generateFallbackUnits } from "../lib/safe-json-parse";
import { logger } from "../lib/logger";
import { handleRouteError, handleBackgroundError } from "../lib/route-error";

const router: IRouter = Router();

router.post("/courses/:courseId/generate", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }

    if (course.status !== "ready" && course.status !== "draft" && course.status !== "failed") {
      res.status(400).json({ error: `Course status is "${course.status}". Must be "ready", "draft", or "failed" to generate.` });
      return;
    }

    const chunkCount = await getCourseChunkCount(courseId);
    console.log(`[Generate] courseId=${courseId}: Pre-check found ${chunkCount} chunks`);

    if (chunkCount === 0) {
      console.log(`[Generate] courseId=${courseId}: REJECTED — no chunks for this course`);
      res.status(400).json({ error: "No processed PDF chunks found for this course. Please upload and process a PDF first." });
      return;
    }

    res.status(202).json({ message: "Generation started", courseId });

    generateCourseContent(courseId, course.title).catch((err) => {
      logger.error({ err, courseId }, "Background generation failed (unhandled)");
      handleBackgroundError(err, "GenerateCourseContent");
    });
  } catch (err) {
    req.log.error({ err }, "Error starting generation");
    handleRouteError(res, err, "StartGeneration");
  }
});

interface UnitData {
  title: string;
  description: string;
  content: string;
  objectives: string[];
  chunkIndices: number[];
}

interface QuestionData {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  chunkRef: string;
}

function extractFirstHeading(text: string): string | null {
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[A-Z][A-Za-z\s]{3,60}$/.test(trimmed) && !trimmed.endsWith(".")) {
      return trimmed;
    }
  }
  return null;
}

function createFallbackUnit(
  chunkGroup: Array<{ content: string; chunkIndex: number }>,
  groupIndex: number,
  courseTitle: string,
): UnitData {
  const combinedContent = chunkGroup.map(c => c.content).join("\n\n");
  const firstLine = combinedContent.split("\n").find(l => l.trim().length > 30) || "";
  const heading = extractFirstHeading(combinedContent) || `Section ${groupIndex + 1}`;
  const preview = firstLine.substring(0, 80).replace(/\s+/g, " ").trim();

  const sentences = combinedContent.match(/[^.!?\n]+[.!?]/g) || [];
  const description = sentences.slice(0, 2).join(" ").trim() || `Based on section ${groupIndex + 1} of the course material: ${preview}`;

  const objectives = [
    `Understand the key concepts in: ${heading}`,
    `Apply the knowledge from the course material about ${heading}`,
    `Analyze and evaluate the concepts presented`,
  ];

  return {
    title: heading,
    description: description.substring(0, 300),
    content: combinedContent,
    objectives,
    chunkIndices: chunkGroup.map(c => c.chunkIndex),
  };
}

function validateUnit(unit: UnitData, usedTitles: Set<string>): { valid: boolean; reason?: string } {
  const titleLower = unit.title.toLowerCase().trim();
  if (!unit.title || unit.title.trim().length < 3) {
    return { valid: false, reason: "Title too short or empty" };
  }
  if (usedTitles.has(titleLower)) {
    return { valid: false, reason: `Duplicate title: "${unit.title}"` };
  }
  const wordCount = unit.content ? unit.content.split(/\s+/).length : 0;
  if (wordCount < 50) {
    return { valid: false, reason: `Content too short (${wordCount} words)` };
  }
  if (!unit.content || unit.content.trim().length < 100) {
    return { valid: false, reason: "Content empty or too short" };
  }
  if (!Array.isArray(unit.objectives) || unit.objectives.length === 0) {
    return { valid: false, reason: "No learning objectives" };
  }
  return { valid: true };
}

function validateQuestion(q: QuestionData): { valid: boolean; reason?: string } {
  if (!q.question || q.question.trim().length < 10) {
    return { valid: false, reason: "Question text too short" };
  }
  if (!Array.isArray(q.options) || q.options.length < 2) {
    return { valid: false, reason: "Need at least 2 options" };
  }
  if (q.options.length < 4) {
    while (q.options.length < 4) {
      q.options.push(`Option ${String.fromCharCode(65 + q.options.length)}`);
    }
  }
  if (!q.correctAnswer || q.correctAnswer.trim().length === 0) {
    return { valid: false, reason: "No correct answer specified" };
  }
  const validLetters = q.options.map((_, i) => String.fromCharCode(65 + i));
  if (!validLetters.includes(q.correctAnswer.toUpperCase())) {
    q.correctAnswer = "A";
  }
  return { valid: true };
}

function createFallbackQuestion(
  chunkContent: string,
  unitTitle: string,
): QuestionData {
  const sentences = chunkContent.match(/[^.!?\n]+[.!?]/g) || [];
  const contentSentence = sentences.find(s => s.trim().split(/\s+/).length > 8) || chunkContent.substring(0, 200);

  return {
    question: `Based on "${unitTitle}", what is discussed in the following: "${contentSentence.trim().substring(0, 100)}..."?`,
    options: [
      "The content describes key concepts related to this topic",
      "It discusses unrelated information",
      "It provides historical background only",
      "None of the above",
    ],
    correctAnswer: "A",
    explanation: `The course material states: "${contentSentence.trim().substring(0, 200)}"`,
    chunkRef: unitTitle,
  };
}

function cleanUnitContentForDB(content: string): string {
  return content
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim();
}

async function generateCourseContent(courseId: number, courseTitle: string) {
  const insertedUnitIds: number[] = [];
  let totalQuestionsInserted = 0;

  try {
    console.log(`[Generate] courseId=${courseId}: Deleting old units/questions before regeneration`);
    await db.delete(courseQuestionsTable).where(eq(courseQuestionsTable.courseId, courseId));
    await db.delete(courseUnitsTable).where(eq(courseUnitsTable.courseId, courseId));
    console.log(`[Generate] courseId=${courseId}: Old units/questions deleted`);

    await db
      .update(coursesTable)
      .set({ generationStatus: "generating_units", generationError: null })
      .where(eq(coursesTable.id, courseId));

    console.log(`[Generate] courseId=${courseId}: Retrieving all course chunks...`);
    const chunks = await retrieveRelevantChunks(
      courseId,
      `Course content for "${courseTitle}": all topics and concepts`,
      200,
      0.0,
    );
    console.log(`[Generate] courseId=${courseId}: Retrieved ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error("No document chunks found. Process the PDF first.");
    }

    const sortedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
    const chunkCount = sortedChunks.length;
    const unitCount = Math.min(Math.max(Math.ceil(chunkCount / 3), 2), 5);
    const chunksPerUnit = Math.max(Math.ceil(chunkCount / unitCount), 1);

    console.log(`[Generate] courseId=${courseId}: Splitting ${chunkCount} chunks into ${unitCount} groups of ~${chunksPerUnit} chunks each`);

    const chunkGroups: Array<Array<{ content: string; chunkIndex: number; similarity: number }>> = [];
    for (let i = 0; i < unitCount; i++) {
      const start = i * chunksPerUnit;
      const end = Math.min(start + chunksPerUnit, sortedChunks.length);
      if (start >= sortedChunks.length) break;
      chunkGroups.push(sortedChunks.slice(start, end));
      const groupPreview = sortedChunks.slice(start, end).map(c =>
        c.content.substring(0, 80).replace(/\s+/g, " ").trim()
      );
      console.log(`[Generate] courseId=${courseId}: Group ${i + 1}/${unitCount}: ${end - start} chunks, preview: "${groupPreview[0] || "empty"}..."`);
    }

    const validatedUnits: UnitData[] = [];
    const usedTitles = new Set<string>();

    for (let i = 0; i < chunkGroups.length; i++) {
      const group = chunkGroups[i];
      if (group.length === 0) continue;

      const groupContext = group.map((c, ci) =>
        `[Chunk ${ci + 1} (idx=${c.chunkIndex})]\n${c.content}`
      ).join("\n\n");

      console.log(`[Generate] courseId=${courseId}: Generating unit ${i + 1}/${chunkGroups.length} from ${group.length} chunks`);
      console.log(`[Generate] courseId=${courseId}: Group ${i + 1} chunk indices:`, group.map(c => c.chunkIndex));

      let unitData: UnitData | null = null;

      try {
        const unitPrompt = buildUnitGenerationPrompt(groupContext, 1);
        const unitResponse = await generateText(unitPrompt);
        console.log(`[Generate] courseId=${courseId}: Unit ${i + 1} AI response length=${unitResponse.length}`);

        const parsed = safeJsonParse<{ units: Array<{ title: string; description: string; content: string; objectives: string[] }> }>(unitResponse, `Unit_${i + 1}`);

        if (parsed.success && parsed.data.units && parsed.data.units.length > 0) {
          const rawUnit = parsed.data.units[0];
          const candidate: UnitData = {
            title: (rawUnit.title || "").trim(),
            description: (rawUnit.description || "").trim(),
            content: cleanUnitContentForDB(rawUnit.content || ""),
            objectives: Array.isArray(rawUnit.objectives) ? rawUnit.objectives.filter(Boolean) : [],
            chunkIndices: group.map(c => c.chunkIndex),
          };

          const validation = validateUnit(candidate, usedTitles);
          if (validation.valid) {
            unitData = candidate;
            console.log(`[Generate] courseId=${courseId}: Unit ${i + 1} AI generation VALID: "${unitData.title}"`);
          } else {
            console.log(`[Generate] courseId=${courseId}: Unit ${i + 1} AI generation REJECTED: ${validation.reason}. Using fallback.`);
          }
        } else if (!parsed.success) {
          console.log(`[Generate] courseId=${courseId}: Unit ${i + 1} AI parse failed: ${parsed.error.substring(0, 100)}. Using fallback.`);
        }
      } catch (unitErr) {
        console.log(`[Generate] courseId=${courseId}: Unit ${i + 1} AI generation error: ${unitErr}. Using fallback.`);
      }

      if (!unitData) {
        unitData = createFallbackUnit(group, i, courseTitle);
        console.log(`[Generate] courseId=${courseId}: Unit ${i + 1} FALLBACK unit: "${unitData.title}"`);
      }

      usedTitles.add(unitData.title.toLowerCase().trim());
      validatedUnits.push(unitData);
    }

    if (validatedUnits.length === 0) {
      throw new Error("No valid units could be generated. The PDF may not contain enough educational content.");
    }

    console.log(`[Generate] courseId=${courseId}: ${validatedUnits.length} units validated and ready for insert`);

    await db
      .update(coursesTable)
      .set({ generationStatus: "generating_questions" })
      .where(eq(coursesTable.id, courseId));

    for (let i = 0; i < validatedUnits.length; i++) {
      const unitData = validatedUnits[i];

      try {
        console.log(`[Generate] courseId=${courseId}: Inserting unit ${i + 1}/${validatedUnits.length} title="${unitData.title}"`);

        const [unit] = await db
          .insert(courseUnitsTable)
          .values({
            courseId,
            title: unitData.title,
            description: unitData.description || "",
            content: unitData.content || "",
            orderIndex: i,
            status: "pending_review",
          })
          .returning();

        insertedUnitIds.push(unit.id);
        console.log(`[Generate] courseId=${courseId}: UNIT INSERTED id=${unit.id} orderIndex=${i} courseId=${courseId} "${unitData.title}"`);

        try {
          const unitChunks = sortedChunks.filter(c =>
            unitData.chunkIndices.includes(c.chunkIndex)
          );
          const qChunksContext = unitChunks.map((c, ci) =>
            `[Chunk ${ci + 1} (idx=${c.chunkIndex})]\n${c.content}`
          ).join("\n\n");

          const questionPrompt = buildQuestionGenerationPrompt(unitData.title, unitData.content, qChunksContext);
          const questionResponse = await generateText(questionPrompt);
          console.log(`[Generate] courseId=${courseId}: Questions AI response length=${questionResponse.length} for unit ${unit.id}`);

          let insertedCount = 0;
          const qParsed = safeJsonParse<{ questions: Array<{ question: string; options: string[]; correctAnswer: string; explanation: string; chunkRef: string }> }>(questionResponse, "Questions");

          if (qParsed.success) {
            const rawQuestions = qParsed.data.questions || [];
            console.log(`[Generate] courseId=${courseId}: AI returned ${rawQuestions.length} questions for unit ${unit.id}`);

            for (const rawQ of rawQuestions.slice(0, 2)) {
              const q: QuestionData = {
                question: rawQ.question || "",
                options: Array.isArray(rawQ.options) ? rawQ.options : [],
                correctAnswer: rawQ.correctAnswer || "A",
                explanation: rawQ.explanation || "",
                chunkRef: rawQ.chunkRef || unitData.title,
              };

              const validation = validateQuestion(q);
              if (!validation.valid) {
                console.log(`[Generate] courseId=${courseId}: Question REJECTED for unit ${unit.id}: ${validation.reason}`);
                continue;
              }

              await db
                .insert(courseQuestionsTable)
                .values({
                  courseId,
                  unitId: unit.id,
                  question: q.question,
                  options: q.options,
                  correctAnswer: q.correctAnswer,
                  explanation: q.explanation,
                  chunkRef: q.chunkRef || "",
                  status: "pending_review",
                });

              insertedCount++;
            }
          } else {
            console.log(`[Generate] courseId=${courseId}: Questions AI parse failed for unit ${unit.id}: ${qParsed.error?.substring(0, 100)}`);
          }

          if (insertedCount < 2) {
            const needed = 2 - insertedCount;
            console.log(`[Generate] courseId=${courseId}: Generating ${needed} fallback questions for unit ${unit.id}`);
            for (let fq = 0; fq < needed; fq++) {
              const chunkForQuestion = unitChunks[fq % unitChunks.length] || unitChunks[0];
              const fallbackQ = createFallbackQuestion(
                chunkForQuestion?.content || unitData.content,
                unitData.title,
              );
              await db
                .insert(courseQuestionsTable)
                .values({
                  courseId,
                  unitId: unit.id,
                  question: fallbackQ.question,
                  options: fallbackQ.options,
                  correctAnswer: fallbackQ.correctAnswer,
                  explanation: fallbackQ.explanation,
                  chunkRef: fallbackQ.chunkRef,
                  status: "pending_review",
                });
              insertedCount++;
            }
          }

          totalQuestionsInserted += insertedCount;
          console.log(`[Generate] courseId=${courseId}: ${insertedCount} QUESTIONS INSERTED for unitId=${unit.id}`);

        } catch (qErr) {
          console.log(`[Generate] courseId=${courseId}: Question generation error for unit ${unit.id}, creating fallback questions`);

          const unitChunks = sortedChunks.filter(c =>
            unitData.chunkIndices.includes(c.chunkIndex)
          );

          for (let fq = 0; fq < 2; fq++) {
            const chunkForQuestion = unitChunks[fq] || { content: unitData.content };
            const fallbackQ = createFallbackQuestion(
              chunkForQuestion.content,
              unitData.title,
            );
            await db
              .insert(courseQuestionsTable)
              .values({
                courseId,
                unitId: unit.id,
                question: fallbackQ.question,
                options: fallbackQ.options,
                correctAnswer: fallbackQ.correctAnswer,
                explanation: fallbackQ.explanation,
                chunkRef: fallbackQ.chunkRef,
                status: "pending_review",
              });
          }
          totalQuestionsInserted += 2;
          console.log(`[Generate] courseId=${courseId}: 2 FALLBACK questions inserted for unitId=${unit.id}`);
        }
      } catch (uErr) {
        logger.error({ err: uErr, courseId, i }, "Unit insert failed, continuing to next unit");
      }
    }

    if (insertedUnitIds.length === 0) {
      throw new Error("No units were inserted into the database. Generation produced zero persisted units.");
    }

    console.log(`[Generate] courseId=${courseId}: SUCCESS. Inserted ${insertedUnitIds.length} units, ${totalQuestionsInserted} questions.`);

    await db
      .update(coursesTable)
      .set({ status: "review_pending", generationStatus: "completed", generationError: null })
      .where(eq(coursesTable.id, courseId));

    logger.info({ courseId, unitCount: insertedUnitIds.length, questionCount: totalQuestionsInserted }, "Course generation completed");
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown generation error";
    logger.error({ err, courseId }, "Course generation failed");
    handleBackgroundError(err, "GenerateCourseContent");

    console.log(`[Generate] courseId=${courseId}: FAILED. Error: ${errorMessage}`);

    await db
      .update(coursesTable)
      .set({
        generationStatus: "failed",
        generationError: errorMessage,
      })
      .where(eq(coursesTable.id, courseId));
  }
}

router.post("/courses/:courseId/units/:unitId/regenerate", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    const unitId = parseInt(req.params.unitId);
    if (isNaN(courseId) || isNaN(unitId)) { res.status(400).json({ error: "Invalid courseId or unitId" }); return; }

    const [unit] = await db
      .select()
      .from(courseUnitsTable)
      .where(and(eq(courseUnitsTable.id, unitId), eq(courseUnitsTable.courseId, courseId)));

    if (!unit) { res.status(404).json({ error: "Unit not found" }); return; }

    const { teacherInstruction } = req.body as { teacherInstruction?: string };

    const chunks = await retrieveRelevantChunks(courseId, unit.title, 12, 0.0);
    const chunksContext = chunks.map((c, i) => `[Chunk ${i + 1}]\n${c.content}`).join("\n\n");

    const prompt = buildRegenerateUnitPrompt(unit.title, unit.content, chunksContext, teacherInstruction);
    const response = await generateText(prompt);

    const parsed = safeJsonParse<{ title: string; description: string; content: string; objectives: string[] }>(response, "RegenerateUnit");
    if (!parsed.success) {
      logger.error({ error: parsed.error, raw: parsed.raw }, "Failed to parse regenerated unit");
      res.status(500).json({ error: "Failed to parse AI response", details: parsed.error });
      return;
    }
    const unitData = parsed.data;

    const [updated] = await db
      .update(courseUnitsTable)
      .set({
        title: unitData.title || unit.title,
        description: unitData.description || unit.description || "",
        content: cleanUnitContentForDB(unitData.content || unit.content || ""),
        teacherNotes: teacherInstruction || null,
      })
      .where(and(eq(courseUnitsTable.id, unitId), eq(courseUnitsTable.courseId, courseId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Unit not found for this course" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error regenerating unit");
    handleRouteError(res, err, "RegenerateUnit");
  }
});

router.post("/courses/:courseId/questions/:questionId/regenerate", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId);
    const questionId = parseInt(req.params.questionId);
    if (isNaN(courseId) || isNaN(questionId)) { res.status(400).json({ error: "Invalid courseId or questionId" }); return; }

    const [question] = await db
      .select()
      .from(courseQuestionsTable)
      .where(and(eq(courseQuestionsTable.id, questionId), eq(courseQuestionsTable.courseId, courseId)));

    if (!question) { res.status(404).json({ error: "Question not found" }); return; }

    const [unit] = await db
      .select()
      .from(courseUnitsTable)
      .where(and(eq(courseUnitsTable.id, question.unitId), eq(courseUnitsTable.courseId, courseId)));

    const { teacherInstruction } = req.body as { teacherInstruction?: string };

    const chunks = await retrieveRelevantChunks(courseId, question.question, 10, 0.0);
    const chunksContext = chunks.map((c, i) => `[Chunk ${i + 1}]\n${c.content}`).join("\n\n");

    const prompt = buildRegenerateQuestionPrompt(
      question.question,
      unit?.title || "",
      unit?.content || "",
      chunksContext,
      teacherInstruction,
    );

    const response = await generateText(prompt);

    const parsed = safeJsonParse<{ question: string; options: string[]; correctAnswer: string; explanation: string; chunkRef: string }>(response, "RegenerateQuestion");
    if (!parsed.success) {
      logger.error({ error: parsed.error, raw: parsed.raw }, "Failed to parse regenerated question");
      res.status(500).json({ error: "Failed to parse AI response", details: parsed.error });
      return;
    }
    const questionData = parsed.data;

    const [updated] = await db
      .update(courseQuestionsTable)
      .set({
        question: questionData.question || question.question,
        options: Array.isArray(questionData.options) && questionData.options.length >= 2 ? questionData.options : question.options,
        correctAnswer: questionData.correctAnswer || question.correctAnswer,
        explanation: questionData.explanation || question.explanation || "",
        chunkRef: questionData.chunkRef || question.chunkRef || "",
      })
      .where(and(eq(courseQuestionsTable.id, questionId), eq(courseQuestionsTable.courseId, courseId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Question not found for this course" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error regenerating question");
    handleRouteError(res, err, "RegenerateQuestion");
  }
});

export default router;
