import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MessageCircle, ChevronRight, CheckCircle2, Circle, BookOpen, Loader2, AlertCircle } from "lucide-react";
import { useCourse, fetchCourseFromApi } from "@/context/CourseContext";
import { useGetCourseProgress, useSaveProgress } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCourseProgressQueryKey } from "@workspace/api-client-react";

function renderUnitContent(content: string): React.ReactNode[] {
  const paragraphs = content.split(/\n\s*\n/).filter(Boolean);
  return paragraphs.map((block, i) => {
    const lines = block.split("\n").filter(Boolean);
    const isList = lines.every((l) => /^[-*\d]/.test(l.trim()));
    if (isList && lines.length > 1) {
      const items = lines.map((l, j) => {
        const text = l.trim().replace(/^[-*\d]+\.?\s*/, "");
        return <li key={j} className="text-foreground">{text}</li>;
      });
      const isOrdered = /^\d+\./.test(lines[0].trim());
      return isOrdered
        ? <ol key={i} className="list-decimal pl-6 mb-4 space-y-1">{items}</ol>
        : <ul key={i} className="list-disc pl-6 mb-4 space-y-1">{items}</ul>;
    }
    if (lines.length <= 1) {
      return <p key={i} className="leading-relaxed text-foreground mb-4">{lines[0]}</p>;
    }
    return (
      <div key={i} className="mb-4">
        {lines.map((line, j) => {
          const trimmed = line.trim();
          if (/^[-*\d]/.test(trimmed)) {
            const text = trimmed.replace(/^[-*\d]+\.?\s*/, "");
            return <p key={j} className="leading-relaxed text-foreground ml-4">- {text}</p>;
          }
          return <p key={j} className="leading-relaxed text-foreground">{line}</p>;
        })}
      </div>
    );
  });
}

export default function StudentCourse() {
  const [, setLocation] = useLocation();
  const { course, courseId, setCourse, setCourseId } = useCourse();
  const queryClient = useQueryClient();

  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [completedUnits, setCompletedUnits] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const resolvedCourseId = useMemo(() => {
    const urlId = parseInt(new URLSearchParams(window.location.search).get("courseId") || "0") || null;
    return urlId || courseId;
  }, [courseId]);

  const unitList = useMemo(() => {
    const raw = course?.units;
    return Array.isArray(raw) ? raw : [];
  }, [course?.units]);

  const questionList = useMemo(() => {
    const raw = course?.questions;
    return Array.isArray(raw) ? raw : [];
  }, [course?.questions]);

  const questionsByUnit = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (const q of questionList) {
      const uId = q.unitId ?? 0;
      if (!map[uId]) map[uId] = [];
      map[uId].push(q);
    }
    return map;
  }, [questionList]);

  useEffect(() => {
    let cancelled = false;

    if (!resolvedCourseId) {
      setLocation("/courses");
      return;
    }

    if (course && courseId === resolvedCourseId) {
      setSelectedUnitId(unitList[0]?.id ?? null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);
    setCourseId(resolvedCourseId);
    fetchCourseFromApi(resolvedCourseId, true).then((data) => {
      if (cancelled) return;
      setCourse(data);
      setCourseId(resolvedCourseId);
      const units = Array.isArray(data.units) ? data.units : [];
      setSelectedUnitId(units[0]?.id ?? null);
      setLoading(false);
    }).catch((err) => {
      if (cancelled) return;
      setFetchError(err instanceof Error ? err.message : "Failed to load course");
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [resolvedCourseId]);

  const { data: progressData, isLoading: progressLoading } = useGetCourseProgress(resolvedCourseId ?? 0, {
    query: { enabled: !!resolvedCourseId, queryKey: getGetCourseProgressQueryKey(resolvedCourseId ?? 0) },
  });

  const saveProgressMutation = useSaveProgress({
    mutation: {
      onSuccess: () => {
        if (resolvedCourseId) {
          queryClient.invalidateQueries({ queryKey: getGetCourseProgressQueryKey(resolvedCourseId) });
        }
      },
    },
  });

  useEffect(() => {
    if (Array.isArray(progressData)) {
      const done = new Set<number>(
        progressData
          .filter((p: any) => p?.completed)
          .map((p: any) => p?.unitId)
          .filter(Boolean)
      );
      setCompletedUnits(done);
    }
  }, [progressData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading course...
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{fetchError}</span>
        </div>
        <Button variant="outline" onClick={() => setLocation("/courses")}>
          Back to Course Library
        </Button>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-4">
        <p className="text-muted-foreground">Course not found.</p>
        <Button variant="outline" onClick={() => setLocation("/courses")}>
          Back to Course Library
        </Button>
      </div>
    );
  }

  if (unitList.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-lg px-4 py-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>No units found for this course.</span>
        </div>
        <Button variant="outline" onClick={() => setLocation("/courses")}>
          Back to Course Library
        </Button>
      </div>
    );
  }

  const safeSelectedId = selectedUnitId ?? unitList[0]?.id;
  const selectedUnit = unitList.find((u) => u.id === safeSelectedId) ?? unitList[0];
  const progress = unitList.length > 0 ? Math.round((completedUnits.size / unitList.length) * 100) : 0;

  const selectedUnitQuestions = questionsByUnit[selectedUnit?.id] ?? [];

  const markComplete = () => {
    if (!selectedUnit?.id) return;
    setCompletedUnits((prev) => new Set([...prev, selectedUnit.id]));

    if (resolvedCourseId) {
      saveProgressMutation.mutate({
        data: { courseId: resolvedCourseId, unitId: selectedUnit.id, completed: true },
      });
    }

    const currentIdx = unitList.findIndex((u) => u.id === selectedUnit.id);
    const next = unitList[currentIdx + 1];
    if (next) setSelectedUnitId(next.id);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-8 h-[calc(100vh-8rem)]">
      <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-foreground mb-1 text-sm line-clamp-2">{course.title}</h3>
          {progressLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm mt-3">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading progress...
            </div>
          ) : (
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">{completedUnits.size} of {unitList.length} units</span>
                <span className="text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 bg-muted/50 border-b font-semibold text-xs uppercase tracking-wider text-muted-foreground">
            Course Units
          </div>
          <nav className="flex flex-col divide-y">
            {unitList.map((unit) => {
              const isActive = unit.id === safeSelectedId;
              const isDone = completedUnits.has(unit.id);
              return (
                <button
                  key={unit.id}
                  onClick={() => setSelectedUnitId(unit.id)}
                  className={`flex items-center gap-3 p-4 text-left w-full transition-colors ${
                    isActive
                      ? "bg-primary/8 border-l-4 border-l-primary"
                      : "hover:bg-muted/50 border-l-4 border-l-transparent"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  )}
                  <div className="min-w-0">
                    <div className={`font-medium text-sm ${isActive ? "text-primary" : "text-foreground"}`}>
                      Unit {(unit.orderIndex ?? unitList.indexOf(unit)) + 1}
                    </div>
                    <div className={`text-xs line-clamp-1 mt-0.5 ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {unit.title}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {resolvedCourseId && (
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <Link href={`/tutor?courseId=${resolvedCourseId}`}>
              <Button variant="outline" className="w-full gap-2">
                <MessageCircle className="w-4 h-4" />
                Ask AI Tutor
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-card border rounded-xl shadow-sm overflow-hidden">
        {selectedUnit && (
          <>
            <div className="border-b px-8 py-6 bg-muted/20 flex-shrink-0">
              <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">Unit {(selectedUnit.orderIndex ?? unitList.indexOf(selectedUnit)) + 1}</div>
              <h2 className="text-2xl font-bold text-foreground">{selectedUnit.title}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{selectedUnit.summary}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {Array.isArray(selectedUnit.objectives) && selectedUnit.objectives.length > 0 && (
                <div className="mb-6 bg-primary/5 border border-primary/15 rounded-xl p-5">
                  <h4 className="font-bold text-foreground flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Learning Objectives
                  </h4>
                  <ul className="space-y-2">
                    {selectedUnit.objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="prose prose-slate max-w-none">
                {renderUnitContent(selectedUnit.content ?? "")}
              </div>

              {selectedUnitQuestions.length > 0 && (
                <div className="mt-8 border-t pt-6">
                  <h4 className="font-bold text-foreground mb-4">Questions for this unit</h4>
                  <div className="space-y-3">
                    {selectedUnitQuestions.map((q: any, i: number) => (
                      <div key={q.id ?? i} className="bg-muted/30 border rounded-lg p-4">
                        <p className="font-medium text-sm mb-2">{i + 1}. {q.question}</p>
                        <ul className="space-y-1">
                          {(Array.isArray(q.options) ? q.options : []).map((opt: string, oi: number) => (
                            <li key={oi} className="text-sm text-muted-foreground flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full border text-xs flex items-center justify-center flex-shrink-0">
                                {String.fromCharCode(65 + oi)}
                              </span>
                              {opt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t p-6 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
              <Link href={`/tutor?courseId=${resolvedCourseId}`}>
                <Button variant="outline" className="gap-2 bg-background">
                  <MessageCircle className="w-4 h-4" />
                  Ask AI Tutor
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Link href={`/test?courseId=${resolvedCourseId}&unitId=${selectedUnit?.id ?? ""}`}>
                  <Button variant="outline" className="gap-2">
                    Unit Test <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  className="gap-2 shadow-sm px-6"
                  onClick={markComplete}
                  disabled={!selectedUnit?.id || completedUnits.has(safeSelectedId) || saveProgressMutation.isPending}
                >
                  {saveProgressMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : completedUnits.has(safeSelectedId) ? (
                    <><CheckCircle2 className="w-4 h-4" /> Completed</>
                  ) : (
                    <>Mark Complete <ChevronRight className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
