import { Router, type IRouter } from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const COURSE_GENERATION_PROMPT = (pdfText: string, filename: string) => `
You are an expert educational course designer. Analyze the following document and generate a structured course.

Document: "${filename}"

Content:
---
${pdfText.slice(0, 12000)}
---

Generate a comprehensive course based on this material. Return ONLY valid JSON with this exact structure:
{
  "title": "Course title derived from the material",
  "description": "2-3 sentence course description",
  "assessmentPlan": "Brief description of how students will be assessed",
  "units": [
    {
      "id": 1,
      "title": "Unit title",
      "summary": "1-2 sentence summary of this unit",
      "content": "3-4 paragraphs of rich lesson content based on the material. Use real concepts and examples from the document.",
      "objectives": ["Learning objective 1", "Learning objective 2", "Learning objective 3"]
    }
  ],
  "questions": [
    {
      "id": 1,
      "unitId": 1,
      "question": "Multiple choice question about unit 1 content",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Explanation of why this is correct"
    }
  ]
}

Requirements:
- Generate exactly 4 units covering different aspects of the material
- Generate 5 questions total (at least 1 per unit, spread across units) — make sure unitId matches the unit number
- All content must come directly from the uploaded document
- Questions must test understanding of the actual document content
- Learning objectives must be specific and measurable
- Lesson content must be detailed and educational (at least 3 paragraphs each)
`;

router.post("/courses/generate-from-pdf", upload.single("pdf"), async (req, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No PDF file uploaded" });
      return;
    }

    const filename = req.file.originalname || "uploaded.pdf";

    let pdfText: string;
    try {
      const data = await pdfParse(req.file.buffer);
      pdfText = data.text;
    } catch {
      res.status(400).json({ error: "Failed to parse PDF. Please ensure the file is a valid PDF." });
      return;
    }

    if (!pdfText || pdfText.trim().length < 50) {
      res.status(400).json({ error: "The PDF appears to be empty or contains no readable text." });
      return;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "user",
          content: COURSE_GENERATION_PROMPT(pdfText, filename),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";

    let course;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      course = JSON.parse(jsonMatch[0]);
    } catch {
      req.log.error({ content }, "Failed to parse AI response as JSON");
      res.status(500).json({ error: "Failed to parse AI response. Please try again." });
      return;
    }

    res.json({ ...course, pdfText });
  } catch (err) {
    req.log.error({ err }, "Error generating course from PDF");
    res.status(500).json({ error: "Failed to generate course. Please try again." });
  }
});

export default router;
