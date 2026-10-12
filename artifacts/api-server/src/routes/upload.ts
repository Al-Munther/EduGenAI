import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { db, coursesTable, uploadedFilesTable, courseUnitsTable, courseQuestionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { chunkText, cleanText, filterChunks, fixMergedWords } from "../lib/chunking";
import { storeChunks, deleteAllCourseChunks } from "../lib/rag";
import { extractPages } from "../lib/extract-pdf";
import { logger } from "../lib/logger";
import { handleRouteError, handleBackgroundError } from "../lib/route-error";

const router: IRouter = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    } catch (err) {
      cb(err as Error, "");
    }
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || ".pdf";
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

router.post("/courses/:courseId/upload", upload.single("file"), async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId as string);
    if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded. Use field name 'file'." });
      return;
    }

    const file = req.file;

    await db
      .update(coursesTable)
      .set({ status: "uploaded", processingStage: "uploaded" })
      .where(eq(coursesTable.id, courseId));

    const [uploadedFile] = await db
      .insert(uploadedFilesTable)
      .values({
        courseId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        filePath: file.path,
      })
      .returning();

    logger.info({ courseId, fileId: uploadedFile.id, originalName: file.originalname }, "File uploaded successfully");

    res.status(201).json({
      message: "File uploaded successfully",
      file: uploadedFile,
    });
  } catch (err) {
    req.log.error({ err }, "Error uploading file");
    handleRouteError(res, err, "UploadFile");
  }
});

router.post("/courses/:courseId/process", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId as string);
    if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }

    console.log(`[Process] courseId=${courseId}: Starting file processing`);

    const files = await db
      .select()
      .from(uploadedFilesTable)
      .where(eq(uploadedFilesTable.courseId, courseId))
      .orderBy(uploadedFilesTable.createdAt);

    console.log(`[Process] courseId=${courseId}: Found ${files.length} files to process`);
    for (const f of files) {
      console.log(`[Process] courseId=${courseId}: fileId=${f.id} originalName="${f.originalName}"`);
    }

    if (files.length === 0) {
      res.status(400).json({ error: "No uploaded files found. Upload a PDF first." });
      return;
    }

    res.json({
      message: "Processing started",
      courseId,
      files: files.length,
    });

    processCourseFiles(courseId, files).catch((err) => {
      logger.error({ err, courseId }, "Background processing failed");
      handleBackgroundError(err, "ProcessCourseFiles");
    });
  } catch (err) {
    req.log.error({ err }, "Error starting processing");
    handleRouteError(res, err, "StartProcessing");
  }
});

router.get("/courses/:courseId/files", async (req, res): Promise<void> => {
  try {
    const courseId = parseInt(req.params.courseId as string);
    if (isNaN(courseId)) { res.status(400).json({ error: "Invalid courseId" }); return; }

    const files = await db
      .select()
      .from(uploadedFilesTable)
      .where(eq(uploadedFilesTable.courseId, courseId))
      .orderBy(desc(uploadedFilesTable.createdAt));

    res.json(files);
  } catch (err) {
    req.log.error({ err }, "Error listing files");
    handleRouteError(res, err, "ListFiles");
  }
});

async function processCourseFiles(courseId: number, files: Array<{ id: number; courseId: number; filePath: string; originalName?: string }>) {
  try {
    await db
      .update(coursesTable)
      .set({ status: "processing", processingStage: "extracting_text", processingError: null, generationStatus: null, generationError: null })
      .where(eq(coursesTable.id, courseId));

    for (const file of files) {
      logger.info({ courseId, fileId: file.id }, "Processing file");
      console.log(`[Upload] courseId=${courseId} fileId=${file.id}: Starting processing`);

      if (file.courseId !== undefined && file.courseId !== courseId) {
        throw new Error(`File id=${file.id} belongs to course ${file.courseId}, not course ${courseId}. Cannot process.`);
      }

      console.log(`[Upload] courseId=${courseId}: Deleting ALL existing chunks, units, and questions for this course before re-processing`);
      await deleteAllCourseChunks(courseId);
      await db.delete(courseQuestionsTable).where(eq(courseQuestionsTable.courseId, courseId));
      await db.delete(courseUnitsTable).where(eq(courseUnitsTable.courseId, courseId));
      console.log(`[Upload] courseId=${courseId}: Old data deleted`);

      await db
        .update(coursesTable)
        .set({ processingStage: "extracting_text" })
        .where(eq(coursesTable.id, courseId));

      const fileBuffer = await fs.readFile(file.filePath);

      const extraction = await extractPages(fileBuffer);

      console.log(`[Upload] courseId=${courseId} fileId=${file.id}: PDF extracted — ${extraction.totalPages} pages, ${extraction.totalChars} chars`);
      console.log(`[Upload] courseId=${courseId}: Extraction quality: ${extraction.quality.pass ? "PASS" : "FAIL"}`);
      console.log(`[Upload] courseId=${courseId}:   wordCount=${extraction.quality.wordCount} avgWordLen=${extraction.quality.avgWordLength.toFixed(1)} linesWithSpaces=${(extraction.quality.linesWithSpacesRatio * 100).toFixed(0)}%`);
      console.log(`[Upload] courseId=${courseId}:   ${extraction.quality.message}`);

      if (!extraction.quality.pass) {
        throw new Error(extraction.quality.message);
      }

      const pageTexts = extraction.pages.map((p) => p.text).join("\n");

      console.log(`[Upload] courseId=${courseId}: First 500 chars of extracted text:`);
      console.log(`  "${pageTexts.substring(0, 500).replace(/\n/g, "\\n").replace(/\r/g, "\\r")}"`);

      const rawTextLen = pageTexts.length;

      const cleanedText = cleanText(pageTexts);
      const cleanedWithFix = fixMergedWords(cleanedText);
      const cleanedLen = cleanedWithFix.length;
      const reductionPct = Math.round(((rawTextLen - cleanedLen) / rawTextLen) * 100);
      console.log(`[Upload] courseId=${courseId}: Cleaned text: ${cleanedLen} chars (${reductionPct}% reduction from raw ${rawTextLen})`);
      console.log(`[Upload] courseId=${courseId}: First 500 chars of cleaned text:`);
      console.log(`  "${cleanedWithFix.substring(0, 500).replace(/\n/g, "\\n").replace(/\r/g, "\\r")}"`);

      if (cleanedLen < 50) {
        throw new Error(`Could not extract enough readable text from this PDF. After cleaning, only ${cleanedLen} characters remain. The PDF may contain only scanned images or metadata.`);
      }

      await db
        .update(coursesTable)
        .set({ processingStage: "chunking" })
        .where(eq(coursesTable.id, courseId));

      const rawChunks = chunkText(cleanedWithFix);

      if (rawChunks.length === 0) {
        throw new Error(`No chunks were generated from ${cleanedLen} chars of text. The text may lack meaningful content or sentence boundaries.`);
      }

      console.log(`[Upload] courseId=${courseId}: Raw chunks before filtering: ${rawChunks.length}`);

      const { kept: chunks, rejected } = filterChunks(rawChunks);

      if (chunks.length === 0) {
        throw new Error(`All ${rawChunks.length} chunks were rejected by quality filter. Text may be too fragmented to use.`);
      }

      if (rejected.length > 0) {
        console.log(`[Upload] courseId=${courseId}: Filtered out ${rejected.length} low-quality chunks, keeping ${chunks.length}/${rawChunks.length}`);
      }

      logger.info({ courseId, fileId: file.id, chunkCount: chunks.length }, "Text chunked");
      console.log(`[Upload] courseId=${courseId}: Generated ${chunks.length} chunks (after filter)`);
      console.log(`[Upload] courseId=${courseId}: Chunk sizes: ${chunks.map(c => c.content.length).join(", ")}`);
      if (chunks.length > 0) {
        console.log(`[Upload] courseId=${courseId}: Sample chunk 0 content (first 300 chars): "${chunks[0].content.substring(0, 300).replace(/\n/g, "\\n")}"`);
      }

      await db
        .update(coursesTable)
        .set({ processingStage: "embedding" })
        .where(eq(coursesTable.id, courseId));

      await db
        .update(coursesTable)
        .set({ processingStage: "storing_vectors" })
        .where(eq(coursesTable.id, courseId));

      await storeChunks(courseId, file.id, chunks);

      await db
        .update(uploadedFilesTable)
        .set({ processed: true, chunkCount: chunks.length })
        .where(eq(uploadedFilesTable.id, file.id));
    }

    await db
      .update(coursesTable)
      .set({ status: "ready", processingStage: "ready", processingError: null })
      .where(eq(coursesTable.id, courseId));

    logger.info({ courseId }, "Course processing completed successfully");
    console.log(`[Upload] courseId=${courseId}: Processing COMPLETE — status=ready`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown processing error";
    logger.error({ err, courseId }, "Course processing failed");
    handleBackgroundError(err, "ProcessCourseFiles");

    console.log(`[Upload] courseId=${courseId}: Processing FAILED — ${errorMessage}`);

    await db
      .update(coursesTable)
      .set({
        status: "failed",
        processingStage: "failed",
        processingError: errorMessage,
      })
      .where(eq(coursesTable.id, courseId));
  }
}

export default router;
