import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send, Bot, User, Loader2, AlertCircle } from "lucide-react";
import { useCourse } from "@/context/CourseContext";

interface Message {
  id: number;
  role: "ai" | "user";
  content: string;
  isStreaming?: boolean;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AiTutor() {
  const [, setLocation] = useLocation();
  const { course, pdfText } = useCourse();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "ai",
      content: course
        ? `Hi! I'm your AI tutor for "${course.title}". I can only answer questions based on the uploaded course material. What would you like to know?`
        : "Hi! I'm your AI tutor. Please upload a PDF to start.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!course) { setLocation("/upload"); }
  }, [course, setLocation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !course) return;

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
          courseTitle: course.title,
          courseContext: pdfText,
          history,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Failed to connect to AI tutor");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

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
            if (data.done) break;
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === streamingId ? { ...m, isStreaming: false } : m))
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
          <p className="text-sm text-muted-foreground mt-0.5">Answers based only on your uploaded course material.</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col shadow-sm border overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
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
