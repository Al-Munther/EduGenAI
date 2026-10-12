import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, FileText, Loader2, Wand2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { useCourse } from "@/context/CourseContext";
import { api } from "@/lib/api";

const POLL_INTERVAL = 3000;

export default function PdfUpload() {
  const [, setLocation] = useLocation();
  const { setCourseId, setFilename: setCtxFilename } = useCourse();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<"idle" | "uploading" | "processing" | "generating" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [activeCourseId, setActiveCourseId] = useState<number | null>(null);
  const [processingStage, setProcessingStage] = useState("");
  const [generationMsg, setGenerationMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

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

  const pollProcessingStatus = (courseId: number) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const course = await api.courses.getStatus(courseId);
        setProcessingStage(course.processingStage || "");
        if (course.status === "ready") {
          stopPolling();
          setStep("generating");
          setGenerationMsg("AI is generating units and questions from the uploaded course material...");
          await startGeneration(courseId);
        } else if (course.status === "failed") {
          stopPolling();
          setStep("error");
          setError(course.processingError || "Processing failed");
        }
      } catch {
        // continue polling
      }
    }, POLL_INTERVAL);
  };

  const startGeneration = async (courseId: number) => {
    try {
      await api.courses.generate(courseId);
      pollGenerationStatus(courseId);
    } catch (err) {
      setStep("error");
      setError(err instanceof Error ? err.message : "Generation failed");
    }
  };

  const pollGenerationStatus = (courseId: number) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const course = await api.courses.getStatus(courseId);
        setGenerationMsg(
          course.generationStatus === "generating_questions"
            ? "Generating assessment questions..."
            : "AI is generating units and questions from the uploaded course material..."
        );
        if (course.generationStatus === "completed") {
          stopPolling();
          setStep("done");
          setGenerationMsg("AI generation completed. Please review and approve the course before publishing.");
          setCourseId(courseId);
        } else if (course.generationStatus === "failed") {
          stopPolling();
          setStep("error");
          setError(course.generationError || "Generation failed");
        }
      } catch {
        // continue polling
      }
    }, POLL_INTERVAL);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    setError(null);

    try {
      setStep("uploading");
      const title = courseTitle.trim() || selectedFile.name.replace(/\.pdf$/i, "");
      const course = await api.courses.create({ title });
      const cid = course.id;
      setActiveCourseId(cid);

      await api.files.upload(cid, selectedFile);
      setCtxFilename(selectedFile.name);

      setStep("processing");
      setProcessingStage("starting...");

      await api.courses.process(cid);
      pollProcessingStatus(cid);
    } catch (err) {
      setStep("error");
      setError(err instanceof Error ? err.message : "Failed to process. Please try again.");
    }
  };

  const handleGoToReview = () => {
    setLocation("/review");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Upload Course Material</h2>
        <p className="text-muted-foreground mt-1">Upload a PDF — AI will extract content and generate a full course.</p>
      </div>

      <Card className="shadow-sm border">
        <CardContent className="p-8 space-y-6">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Course Title</label>
            <input
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="Enter a title for your course"
              className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
              disabled={step !== "idle"}
            />
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => step === "idle" && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
              isDragging ? "border-primary bg-primary/5" : selectedFile ? "border-green-400 bg-green-50" : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              disabled={step !== "idle"}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
            {selectedFile ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                <div className="flex items-center gap-2 text-green-700 font-semibold text-lg">
                  <FileText className="w-5 h-5" />
                  {selectedFile.name}
                </div>
                <p className="text-green-600 text-sm mt-1">{(selectedFile.size / 1024).toFixed(0)} KB</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-14 h-14 text-muted-foreground mb-4" />
                <p className="font-semibold text-foreground text-lg">Upload syllabus or lecture notes</p>
                <p className="text-muted-foreground text-sm mt-1">Drag and drop a PDF here, or click to browse</p>
                <p className="text-xs text-muted-foreground/60 mt-3">Supports PDF up to 50MB</p>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === "processing" && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing PDF...
              </div>
              <p className="text-blue-600 text-xs">Stage: {processingStage}</p>
              <div className="w-full bg-blue-200 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full w-2/3 animate-pulse" />
              </div>
            </div>
          )}

          {step === "generating" && (
            <div className="bg-violet-50 border border-violet-100 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-violet-700 font-medium text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                {generationMsg}
              </div>
              <div className="w-full bg-violet-200 rounded-full h-1.5">
                <div className="bg-violet-600 h-1.5 rounded-full w-1/2 animate-pulse" />
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-900 font-medium text-sm">{generationMsg}</p>
                <p className="text-amber-700 text-xs mt-1">The course will not be visible to students until you review, approve, and publish it.</p>
              </div>
            </div>
          )}

          {step === "idle" && (
            <Button
              onClick={handleProcess}
              disabled={!selectedFile}
              className="w-full gap-2 h-12 text-base font-semibold shadow-sm"
              size="lg"
            >
              <Wand2 className="w-5 h-5" />
              Upload & Process with AI
            </Button>
          )}

          {step === "uploading" && (
            <Button disabled className="w-full gap-2 h-12 text-base" size="lg">
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading...
            </Button>
          )}

          {step === "done" && (
            <Button onClick={handleGoToReview} className="w-full gap-2 h-12 text-base shadow-sm" size="lg">
              Review Generated Content
              <ArrowRight className="w-5 h-5" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
