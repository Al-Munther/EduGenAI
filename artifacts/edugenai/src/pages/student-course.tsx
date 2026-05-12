import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MessageCircle, ChevronRight, CheckCircle2, Circle, BookOpen, Loader2 } from "lucide-react";
import { useCourse } from "@/context/CourseContext";
import { useGetCourseProgress, useSaveProgress } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCourseProgressQueryKey } from "@workspace/api-client-react";

export default function StudentCourse() {
  const [, setLocation] = useLocation();
  const { course, courseId } = useCourse();
  const queryClient = useQueryClient();

  const [selectedUnitId, setSelectedUnitId] = useState<number>(1);
  const [completedUnits, setCompletedUnits] = useState<Set<number>>(new Set());

  const { data: progressData, isLoading: progressLoading } = useGetCourseProgress(courseId ?? 0, {
    query: { enabled: !!courseId, queryKey: getGetCourseProgressQueryKey(courseId ?? 0) },
  });

  const saveProgressMutation = useSaveProgress({
    mutation: {
      onSuccess: () => {
        if (courseId) {
          queryClient.invalidateQueries({ queryKey: getGetCourseProgressQueryKey(courseId) });
        }
      },
    },
  });

  useEffect(() => {
    if (!course) { setLocation("/courses"); return; }
    setSelectedUnitId(course.units[0]?.id ?? 1);
  }, [course, setLocation]);

  useEffect(() => {
    if (progressData) {
      const done = new Set<number>(
        progressData
          .filter((p) => p.completed)
          .map((p) => p.unitId)
      );
      setCompletedUnits(done);
    }
  }, [progressData]);

  if (!course) return null;

  const selectedUnit = course.units.find((u) => u.id === selectedUnitId) ?? course.units[0];
  const progress = Math.round((completedUnits.size / course.units.length) * 100);

  const markComplete = () => {
    setCompletedUnits((prev) => new Set([...prev, selectedUnitId]));

    if (courseId) {
      saveProgressMutation.mutate({
        data: { courseId, unitId: selectedUnitId, completed: true },
      });
    }

    const currentIdx = course.units.findIndex((u) => u.id === selectedUnitId);
    const next = course.units[currentIdx + 1];
    if (next) setSelectedUnitId(next.id);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-8 h-[calc(100vh-8rem)]">
      {/* Sidebar */}
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
                <span className="text-muted-foreground">{completedUnits.size} of {course.units.length} units</span>
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
            {course.units.map((unit) => {
              const isActive = unit.id === selectedUnitId;
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
                      Unit {unit.id}
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 bg-card border rounded-xl shadow-sm overflow-hidden">
        {selectedUnit && (
          <>
            <div className="border-b px-8 py-6 bg-muted/20 flex-shrink-0">
              <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">Unit {selectedUnit.id}</div>
              <h2 className="text-2xl font-bold text-foreground">{selectedUnit.title}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{selectedUnit.summary}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {selectedUnit.objectives.length > 0 && (
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
                {selectedUnit.content.split("\n").filter(Boolean).map((para, i) => (
                  <p key={i} className="leading-relaxed text-foreground mb-4">{para}</p>
                ))}
              </div>
            </div>

            <div className="border-t p-6 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
              <Link href="/tutor">
                <Button variant="outline" className="gap-2 bg-background">
                  <MessageCircle className="w-4 h-4" />
                  Ask AI Tutor
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <Link href="/test">
                  <Button variant="outline" className="gap-2">
                    Unit Test <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  className="gap-2 shadow-sm px-6"
                  onClick={markComplete}
                  disabled={completedUnits.has(selectedUnitId) || saveProgressMutation.isPending}
                >
                  {saveProgressMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : completedUnits.has(selectedUnitId) ? (
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
