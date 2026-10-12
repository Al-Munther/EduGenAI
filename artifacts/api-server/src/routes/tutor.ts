import { Router, type IRouter } from "express";
import { db, coursesTable, tutorConversationsTable, tutorMessagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { retrieveRelevantChunks } from "../lib/rag";
import { streamChat } from "../lib/ollama";
import { buildTutorSystemPrompt, buildTutorContextPrompt } from "../lib/prompt-templates";
import { logger } from "../lib/logger";
import { handleRouteError } from "../lib/route-error";

const router: IRouter = Router();

router.post("/tutor/chat", async (req, res): Promise<void> => {
  const { message, courseId, studentId, history } = req.body as {
    message: string;
    courseId: number;
    studentId?: number;
    history?: Array<{ role: string; content: string }>;
  };

  if (!message || !courseId) {
    res.status(400).json({ error: "message and courseId are required" });
    return;
  }

  try {
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId));
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    const relevantChunks = await retrieveRelevantChunks(courseId, message, 5, 0.4);

    if (relevantChunks.length === 0) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const noInfoMsg = "The uploaded course material does not contain enough information to answer this question.";
      res.write(`data: ${JSON.stringify({ content: noInfoMsg })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, sources: [] })}\n\n`);
      res.end();
      return;
    }

    const sources = relevantChunks.map((c) => ({
      chunkIndex: c.chunkIndex,
      pageNumber: c.metadata?.pageNumber,
      similarity: Math.round(c.similarity * 100) / 100,
      excerpt: c.content.slice(0, 200) + "...",
    }));

    const systemPrompt = buildTutorSystemPrompt(course.title);
    const contextPrompt = buildTutorContextPrompt(relevantChunks);

    const chatMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: `${systemPrompt}\n\n${contextPrompt}` },
      ...(history || []).slice(-8).map((m) => ({
        role: m.role === "ai" ? "assistant" : m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sid = studentId || 2;
    const [conversation] = await db
      .insert(tutorConversationsTable)
      .values({ studentId: sid, courseId })
      .returning();

    let fullResponse = "";

    try {
      for await (const token of streamChat(chatMessages.slice(1), chatMessages[0].content)) {
        fullResponse += token;
        res.write(`data: ${JSON.stringify({ content: token })}\n\n`);
      }

      await db.insert(tutorMessagesTable).values({
        conversationId: conversation.id,
        role: "assistant",
        content: fullResponse,
        sources: sources,
      });

      res.write(`data: ${JSON.stringify({ done: true, sources })}\n\n`);
      res.end();
    } catch (err) {
      logger.error({ err }, "Tutor streaming error");
      console.error("REAL ERROR [TutorStream]:", err);
      res.write(`data: ${JSON.stringify({ error: "Failed to get response from AI tutor" })}\n\n`);
      res.end();
    }
  } catch (err) {
    req.log.error({ err }, "Error in tutor chat");
    console.error("REAL ERROR [TutorChat]:", err);
    if (!res.headersSent) {
      handleRouteError(res, err, "TutorChat");
    } else {
      res.write(`data: ${JSON.stringify({ error: "Failed to get response from AI tutor" })}\n\n`);
      res.end();
    }
  }
});

export default router;
