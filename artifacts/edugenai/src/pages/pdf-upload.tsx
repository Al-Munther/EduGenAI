import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadCloud, FileText, Loader2, Wand2, CheckCircle2, AlertCircle } from "lucide-react";
import { useCourse } from "@/context/CourseContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function PdfUpload() {
  const [, setLocation] = useLocation();
  const { setCourse, setPdfText, setFilename } = useCourse();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opts, setOpts] = useState({ units: true, tests: true, tutor: true });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("pdf", selectedFile);

      const res = await fetch(`${BASE}/api/courses/generate-from-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(data.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      const { pdfText, ...courseData } = data;

      setCourse(courseData);
      setPdfText(pdfText || "");
      setFilename(selectedFile.name);

      setLocation("/generate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process PDF. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Upload Course Material</h2>
        <p className="text-muted-foreground mt-1">Upload a PDF — our AI will generate a full course from your material.</p>
      </div>

      <Card className="shadow-sm border">
        <CardContent className="p-8 space-y-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
              isDragging ? "border-primary bg-primary/5" : selectedFile ? "border-green-400 bg-green-50" : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
            {selectedFile ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                <div className="flex items-center gap-2 text-green-700 font-semibold text-lg">
                  <FileText className="w-5 h-5" />
                  {selectedFile.name}
                </div>
                <p className="text-green-600 text-sm mt-1">{(selectedFile.size / 1024).toFixed(0)} KB — Click to change file</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-14 h-14 text-muted-foreground mb-4" />
                <p className="font-semibold text-foreground text-lg">Upload syllabus or lecture notes</p>
                <p className="text-muted-foreground text-sm mt-1">Drag and drop a PDF here, or click to browse</p>
                <p className="text-xs text-muted-foreground/60 mt-3">Supports PDF up to 20MB</p>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <p className="text-sm font-semibold text-foreground">AI Generation Options</p>
            {([
              { key: "units", label: "Generate course units", desc: "Break content into structured learning units" },
              { key: "tests", label: "Generate unit tests", desc: "Create assessment questions from the material" },
              { key: "tutor", label: "Enable AI Tutor", desc: "Allow students to ask questions about the content" },
            ] as const).map(({ key, label, desc }) => (
              <div key={key} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                <Checkbox
                  id={key}
                  checked={opts[key]}
                  onCheckedChange={(v) => setOpts({ ...opts, [key]: !!v })}
                  className="mt-0.5"
                />
                <div>
                  <label htmlFor={key} className="font-medium text-sm text-foreground cursor-pointer">{label}</label>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={handleProcess}
            disabled={!selectedFile || isProcessing}
            className="w-full gap-2 h-12 text-base font-semibold shadow-sm"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing with AI... This may take a moment
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Process with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
