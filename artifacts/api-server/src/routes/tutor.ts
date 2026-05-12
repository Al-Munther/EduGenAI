import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

router.post("/tutor/chat", async (req, res): Promise<void> => {
  const { message, courseTitle, courseContext, history } = req.body as {
    message: string;
    courseTitle: string;
    courseContext: string;
    history: Array<{ role: string; content: string }>;
  };

  if (!message || !courseContext) {
    res.status(400).json({ error: "message and courseContext are required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const systemPrompt = `You are an AI tutor for the course "${courseTitle || "the uploaded course"}". 
You must ONLY answer questions based on the following course material. If a question is not covered in the material, say "Based on the uploaded course material, I don't have information about that specific topic."

Always start your response with "Based on the uploaded course material, ..."

Course Material:
---
${(courseContext || "").slice(0, 8000)}
---`;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...(history || []).slice(-8).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 1024,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Error in tutor chat");
    res.write(`data: ${JSON.stringify({ error: "Failed to get response from AI tutor" })}\n\n`);
    res.end();
  }
});

export default router;
