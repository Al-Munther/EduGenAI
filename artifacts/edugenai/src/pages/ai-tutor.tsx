import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send, Bot, User, Loader2, AlertCircle, BookOpen } from "lucide-react";
import { useCourse } from "@/context/CourseContext";

interface Source {
  chunkIndex: number;
  pageNumber?: number;
  similarity: number;
  excerpt: string;
}

interface Message {
  id: number;
  role: "ai" | "user";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export default function AiTutor() {
  const [, setLocation] = useLocation();
  const { course, courseId } = useCourse();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "ai",
      content: course
        ? `Hi! I'm your AI tutor for "${course.title}". I can only answer questions based on the uploaded course material. What would you like to know?`
        : "Hi! I'm your AI tutor. Please select a course to start.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!course) { setLocation("/courses"); }
  }, [course, setLocation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleSources = (msgId: number) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !course || !courseId) return;

    const userMsg: Message = { id: Date.now(), role: "user", content: inputValue };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    const history = messages
      .filter((m) => m.id !== 0)
      .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }));

    const streamingId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: streamingId, role: "ai", content: "", isStreaming: true }]);

    try {
      const res = await fetch(`${BASE}/api/tutor/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputValue,
          courseId,
          history,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Failed to connect to AI tutor");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let finalSources: Source[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) throw new Error(data.error);
            if (data.content) {
              accumulated += data.content;
              setMessages((prev) =>
                prev.map((m) => (m.id === streamingId ? { ...m, content: accumulated } : m))
              );
            }
            if (data.sources) {
              finalSources = data.sources;
            }
            if (data.done) break;
          } catch {
            // ignore parse errors
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === streamingId ? { ...m, isStreaming: false, sources: finalSources } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => prev.filter((m) => m.id !== streamingId));
    } finally {
      setIsLoading(false);
    }
  };

  if (!course) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6 flex-shrink-0">
        <Link href="/student-course">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            AI Tutor — {course.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Answers based only on your uploaded course material using RAG.</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col shadow-sm border overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id}>
              <div className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === "ai" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {msg.role === "ai" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/50 border rounded-tl-sm text-foreground"
                }`}>
                  {msg.content || (msg.isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : "")}
                </div>
              </div>

              {msg.sources && msg.sources.length > 0 && msg.role === "ai" && (
                <div className="ml-12 mt-2">
                  <button
                    onClick={() => toggleSources(msg.id)}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
                  >
                    <BookOpen className="w-3 h-3" />
                    {expandedSources.has(msg.id) ? "Hide" : "Show"} sources ({msg.sources.length})
                  </button>
                  {expandedSources.has(msg.id) && (
                    <div className="mt-2 space-y-2">
                      {msg.sources.map((source, i) => (
                        <div key={i} className="bg-primary/5 border border-primary/10 rounded-lg p-3 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <span className="font-medium text-primary">Chunk {source.chunkIndex}</span>
                            {source.pageNumber && <span>Page {source.pageNumber}</span>}
                            <span>Similarity: {source.similarity}</span>
                          </div>
                          <p className="text-muted-foreground line-clamp-2">{source.excerpt}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3 mx-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t bg-card flex-shrink-0">
          <form
            className="flex gap-3"
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question about the course material..."
              className="flex-1 bg-background"
              disabled={isLoading}
            />
            <Button type="submit" disabled={!inputValue.trim() || isLoading} className="gap-2 px-6">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send</>}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
