export function buildTutorSystemPrompt(courseTitle: string): string {
  return `You are an AI tutor for the course "${courseTitle}".
You must ONLY answer questions based on the uploaded course material provided in the context below.
Do not use outside knowledge or make up information.
If the answer is not available in the provided context, respond with:
"The uploaded course material does not contain enough information to answer this question."
Always reference specific parts of the material when answering.
Be concise and educational.

IMPORTANT: The course material may contain some imperfect text from PDF extraction. If you encounter:
- Words that appear merged together (no spaces), try to infer the correct separation
- Incomplete sentences, treat them as fragments and focus on the readable parts
- Reference/bibliography fragments, ignore them as they are not course content
- Page numbers or headers, disregard them
Rewrite your answer in clear, properly spaced educational language. Do NOT copy broken text verbatim.`;
}

export function buildTutorContextPrompt(chunks: Array<{ content: string; chunkIndex: number; pageNumber?: number }>): string {
  const context = chunks
    .map((c) => `[Source: chunk ${c.chunkIndex}${c.pageNumber ? `, page ${c.pageNumber}` : ""}]\n${c.content}`)
    .join("\n\n---\n\n");

  return `Here is the relevant course material:\n\n${context}`;
}

export function buildUnitGenerationPrompt(chunksContext: string, totalUnits: number): string {
  return `You are an expert educational course designer. Based ONLY on the following course material excerpt, create exactly ONE structured learning unit.

Course Material (this is the ONLY content you may use):
---
${chunksContext}
---

IMPORTANT RULES:
- ALL content must come ONLY from the provided material above
- Do NOT use any outside knowledge or generic content
- Do NOT invent examples not present in the material
- If the material contains equations, terms, or specific data, include them
- The unit must be entirely grounded in the provided text

Return ONLY valid JSON. No markdown. No code fences. No explanation. No extra text before or after.
Use simple one-line strings. Escape all internal double quotes with backslash.

{"units":[{"title":"Title based on the material content","description":"Detailed description (2-3 sentences) based only on the material","content":"Comprehensive lesson content (at least 300 words). Include main explanation, key concepts, examples/equations/terms from the material, and a summary. ALL from the material only.","objectives":["Objective 1","Objective 2","Objective 3"]}]}

Requirements:
- ALL content must come ONLY from the provided course material
- Do NOT use outside knowledge — if the material is insufficient, say so in the description
- Generate exactly ${totalUnits} unit
- Each unit MUST have at least 300 words of content
- Include specific terms, equations, examples from the material when present

HANDLING BROKEN TEXT:
- The extracted text may contain some spacing errors (merged words) or imperfect formatting
- If you see merged words like "GeographicInformationSystem", infer the correct separation: "Geographic Information System"
- Ignore reference/bibliography fragments — they are NOT course content
- Ignore page numbers, headers, footers, and repeated document metadata
- Rewrite extracted concepts into clear, properly spaced educational paragraphs
- Do NOT copy broken text verbatim — always present clean, readable content
- If the provided context is mostly unreadable or insufficient, set description to "Insufficient readable content was extracted from this section of the PDF."`;
}

export function buildQuestionGenerationPrompt(
  unitTitle: string,
  unitContent: string,
  chunksContext: string,
): string {
  return `Based ONLY on the following course material, generate exactly 2 multiple-choice questions for the unit "${unitTitle}".

Unit Content:
---
${unitContent}
---

Original Course Material Context:
---
${chunksContext}
---

Return ONLY valid JSON. No markdown. No code fences. No explanation. No extra text.
Use simple one-line strings. Escape all internal double quotes.

{"questions":[{"question":"Specific question based on the material?","options":["Correct detailed answer","Wrong option 1","Wrong option 2","Wrong option 3"],"correctAnswer":"A","explanation":"Explanation of why this is correct, referencing specific material","chunkRef":"Reference to the specific part of material"},{"question":"Second specific question?","options":["Option A","Option B","Option C","Option D"],"correctAnswer":"B","explanation":"Explanation referencing the material","chunkRef":"Reference"}]}

Requirements:
- Generate exactly 2 questions — no more, no fewer
- Each question must test a DIFFERENT concept from the unit material
- All questions must be based ONLY on the provided material
- Do NOT use outside knowledge
- Questions must test understanding of specific content from the material
- Provide exactly 4 options each labeled with letters (A, B, C, D)
- correctAnswer must be the LETTER (A, B, C, or D) of the correct option
- Make wrong options plausible but clearly incorrect based on the material
- Ignore bibliography fragments, page numbers, and headers in the context
- If the context is unreadable, base questions on the unit content only`;
}

export function buildRegenerateUnitPrompt(
  unitTitle: string,
  unitContent: string,
  chunksContext: string,
  teacherInstruction?: string,
): string {
  const instruction = teacherInstruction
    ? `\n\nTeacher's improvement request: ${teacherInstruction}`
    : "";

  return `Based ONLY on the following course material, regenerate the learning unit "${unitTitle}" with improved content.

Current Unit Content:
---
${unitContent}
---

Course Material Context:
---
${chunksContext}
---
${instruction}

Return ONLY valid JSON. No markdown. No code fences. No extra text.
Use simple one-line strings. Escape all internal double quotes.

{"title":"Unit title","description":"Updated description","content":"Improved detailed lesson content based only on the material","objectives":["Objective 1","Objective 2","Objective 3"]}

Requirements:
- All content must come ONLY from the provided course material
- Do not use outside knowledge
- Content must be detailed and educational`;
}

export function buildRegenerateQuestionPrompt(
  questionText: string,
  unitTitle: string,
  unitContent: string,
  chunksContext: string,
  teacherInstruction?: string,
): string {
  const instruction = teacherInstruction
    ? `\n\nTeacher's improvement request: ${teacherInstruction}`
    : "";

  return `Based ONLY on the following course material, regenerate a multiple-choice question for the unit "${unitTitle}".

Original question: "${questionText}"

Unit Content:
---
${unitContent}
---

Course Material Context:
---
${chunksContext}
---
${instruction}

Return ONLY valid JSON. No markdown. No code fences. No extra text.
Use simple one-line strings. Escape all internal double quotes.

{"question":"Improved question text based on material","options":["A","B","C","D"],"correctAnswer":"A","explanation":"Brief explanation referencing the material","chunkRef":"Reference"}

Requirements:
- All content must come ONLY from the provided course material
- Do not use outside knowledge`;
}
