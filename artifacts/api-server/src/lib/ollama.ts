import { logger } from "./logger";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";
const GENERATION_MODEL = process.env.OLLAMA_GENERATION_MODEL || "llama3.1";

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

export interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

export interface OllamaChatResponse {
  message: { role: string; content: string };
  done: boolean;
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      prompt: text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Ollama embedding failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as OllamaEmbeddingResponse;
  return data.embedding;
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GENERATION_MODEL,
      messages,
      stream: false,
      options: {
        num_predict: 4096,
        temperature: 0.3,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Ollama generation failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as OllamaChatResponse;
  return data.message.content;
}

export async function* streamChat(
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string,
): AsyncGenerator<string> {
  const fullMessages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) {
    fullMessages.push({ role: "system", content: systemPrompt });
  }
  fullMessages.push(...messages);

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GENERATION_MODEL,
      messages: fullMessages,
      stream: true,
      options: {
        num_predict: 2048,
        temperature: 0.3,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Ollama stream chat failed (${res.status}): ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body from Ollama");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line) as OllamaChatResponse;
        if (data.message?.content) {
          yield data.message.content;
        }
        if (data.done) return;
      } catch {
        // skip malformed lines
      }
    }
  }
}

export { OLLAMA_BASE_URL, EMBEDDING_MODEL, GENERATION_MODEL };
