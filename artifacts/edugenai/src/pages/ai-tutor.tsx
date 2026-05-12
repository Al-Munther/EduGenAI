import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send, Bot, User } from "lucide-react";

interface Message {
  id: number;
  role: "ai" | "user";
  content: string;
}

const initialMessages: Message[] = [
  {
    id: 1,
    role: "user",
    content: "What is supervised learning?"
  },
  {
    id: 2,
    role: "ai",
    content: "Based on the uploaded course material, supervised learning is a type of machine learning where the model is trained on labeled data. Each training example consists of an input and the expected output, allowing the model to learn the mapping between them."
  },
  {
    id: 3,
    role: "user",
    content: "Can you give me an example?"
  },
  {
    id: 4,
    role: "ai",
    content: "Based on the uploaded course material, a classic example of supervised learning is email spam detection. The model is trained on emails labeled as 'spam' or 'not spam', and learns to classify new emails accordingly."
  }
];

export default function AiTutor() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newUserMsg: Message = {
      id: Date.now(),
      role: "user",
      content: inputValue
    };

    setMessages([...messages, newUserMsg]);
    setInputValue("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: Date.now() + 1,
        role: "ai",
        content: `Based on the uploaded course material, your question about "${newUserMsg.content}" relates closely to the concepts covered in Unit 2. In supervised learning, the key is having labeled data...`
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/student-course">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            AI Tutor — Introduction to AI
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">This tutor answers based on your uploaded course material only.</p>
        </div>
      </div>

      {/* Chat Window */}
      <Card className="flex-1 flex flex-col shadow-sm border overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
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
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-card">
          <form 
            className="flex gap-3"
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          >
            <Input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question about the course material..." 
              className="flex-1 bg-background"
            />
            <Button type="submit" disabled={!inputValue.trim()} className="gap-2 px-6">
              Send <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
