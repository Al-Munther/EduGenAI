import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ChevronRight, FileText, Target, ClipboardList, Upload, Check, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useCourse, fetchCourseFromApi } from "@/context/CourseContext";
import { api } from "@/lib/api";

const UNIT_COLORS = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500"];

export default function CourseGeneration() {
  const [, setLocation] = useLocation();
  const { course, filename, courseId, generationStatus, setCourse, setCourseId, setFilename } = useCourse();
  const [statusData, setStatusData] = useState<any>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const resolvedCourseId = courseId || parseInt(new URLSearchParams(window.location.search).get("courseId") || "0") || null;

  useEffect(() => {
    if (course) {
      setLoading(false);
      return;
    }
    if (!resolvedCourseId) {
      setLocation("/upload");
      return;
    }
    setCourseId(resolvedCourseId);
    (async () => {
      try {
        const data = await api.courses.getStatus(resolvedCourseId);
        setStatusData(data);
        setFilename(data.filename || "");
        if (data.generationStatus === "completed") {
          const c = await fetchCourseFromApi(resolvedCourseId);
          setCourse(c);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!resolvedCourseId) return;
    if (generationStatus === "completed" || course) return;
    const interval = setInterval(async () => {
      try {
        const data = await api.courses.getStatus(resolvedCourseId);
        setStatusData(data);
        if (data.generationStatus === "completed") {
          clearInterval(interval);
          const c = await fetchCourseFromApi(resolvedCourseId);
          setCourse(c);
        } else if (data.generationStatus === "failed") {
          clearInterval(interval);
        }
      } catch {
        setPollError("Failed to check generation status");
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [resolvedCourseId, generationStatus, course, setCourse]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading...
      </div>
    );
  }

  const isGenerating = statusData?.generationStatus === "generating_units" || statusData?.generationStatus === "generating_questions";
  const generationFailed = statusData?.generationStatus === "failed";
  const generationComplete = statusData?.generationStatus === "completed" || course;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-0.5">
            <FileText className="w-3.5 h-3.5" />
            <span>{filename || "Course"}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {course?.title || statusData?.title || "Course Generation"}
          </h2>
        </div>
      </div>

      {isGenerating && (
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
            <div>
              <p className="font-medium text-violet-800">AI is generating units and questions from the uploaded course material...</p>
              <p className="text-sm text-violet-600 mt-1">
                {statusData?.generationStatus === "generating_questions"
                  ? "Creating assessment questions for each unit..."
                  : "Analyzing content and structuring learning units..."}
              </p>
            </div>
          </div>
          <div className="w-full bg-violet-200 rounded-full h-2">
            <div className="bg-violet-600 h-2 rounded-full w-1/2 animate-pulse" />
          </div>
        </div>
      )}

      {generationFailed && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-xl px-5 py-4">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Generation Failed</p>
            <p className="text-sm">{statusData?.generationError || "An error occurred during generation."}</p>
          </div>
        </div>
      )}

      {generationComplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-900 font-medium">AI generation completed. Please review and approve the course before publishing.</p>
            <p className="text-amber-700 text-sm mt-1">The course will not be visible to students until you review, approve, and publish it.</p>
          </div>
        </div>
      )}

      {generationComplete && course && (
        <>
          <div className="bg-gradient-to-r from-primary/5 to-transparent border rounded-xl p-6">
            <p className="text-muted-foreground leading-relaxed">{course.description}</p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Generated Units
            </h3>
            <div className="grid gap-4">
              {course.units.map((unit, index) => (
                <Card key={unit.id} className="shadow-sm border overflow-hidden">
                  <div className="flex">
                    <div className={`w-1.5 flex-shrink-0 ${UNIT_COLORS[index % UNIT_COLORS.length]}`} />
                    <CardContent className="p-5 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Unit {index + 1}</div>
                          <h4 className="font-bold text-foreground text-base mb-2">{unit.title}</h4>
                          <p className="text-muted-foreground text-sm leading-relaxed">{unit.summary}</p>
                          {unit.objectives.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {unit.objectives.slice(0, 3).map((obj, i) => (
                                <span key={i} className="text-xs bg-primary/8 text-primary px-2.5 py-1 rounded-full font-medium border border-primary/15">
                                  {obj}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className={`w-10 h-10 rounded-lg ${UNIT_COLORS[index % UNIT_COLORS.length]} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                          {index + 1}
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Card className="shadow-sm border bg-muted/20">
            <CardContent className="p-6">
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Assessment Plan
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">{course.assessmentPlan}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> {course.questions.length} assessment questions generated from your material</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> AI Tutor initialized with your document's knowledge base</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> {course.units.length} units structured from the uploaded content</li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {generationComplete && (
        <div className="flex items-center justify-between pt-2">
          <Link href="/upload">
            <Button variant="ghost" className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Different File
            </Button>
          </Link>
          <Link href={`/review${resolvedCourseId ? `?courseId=${resolvedCourseId}` : ""}`}>
            <Button size="lg" className="gap-2 px-8 shadow-sm">
              Continue to Teacher Review
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      )}

      {generationFailed && (
        <Link href="/upload">
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Try Again
          </Button>
        </Link>
      )}
    </div>
  );
}
