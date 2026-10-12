import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, RotateCcw, Trophy, XCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCourse, fetchCourseFromApi } from "@/context/CourseContext";
import { api } from "@/lib/api";

export default function UnitTest() {
  const [, setLocation] = useLocation();
  const { course, courseId, setCourse, setCourseId } = useCourse();

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);

  const resolvedCourseId = useMemo(() => {
    const urlId = parseInt(urlParams.get("courseId") || "0") || null;
    return urlId || courseId;
  }, [urlParams, courseId]);

  const resolvedUnitId = useMemo(() => {
    const urlUnitId = parseInt(urlParams.get("unitId") || "0") || null;
    return urlUnitId;
  }, [urlParams]);

  const questionList = useMemo(() => {
    if (!course) return [];
    let extracted: any[] = [];
    if (Array.isArray(course.questions) && course.questions.length > 0) {
      extracted = course.questions;
    } else if (Array.isArray(course.units)) {
      for (const unit of course.units) {
        if (Array.isArray((unit as any).questions)) {
          for (const q of (unit as any).questions) {
            extracted.push({
              id: q.id ?? 0,
              unitId: q.unitId ?? unit.id ?? 0,
              question: q.question ?? "",
              options: Array.isArray(q.options) ? q.options : [],
              correctIndex: (() => {
                if (typeof q.correctIndex === "number") return q.correctIndex;
                if (typeof q.correctAnswer === "string") {
                  const ci = parseInt(q.correctAnswer, 10);
                  if (!isNaN(ci)) return ci;
                  const found = (Array.isArray(q.options) ? q.options : []).indexOf(q.correctAnswer);
                  return found !== -1 ? found : 0;
                }
                return 0;
              })(),
              explanation: q.explanation ?? "",
            });
          }
        }
      }
    }
    if (resolvedUnitId) {
      extracted = extracted.filter((q) => q.unitId === resolvedUnitId);
    }
    return extracted;
  }, [course, resolvedUnitId]);

  useEffect(() => {
    let cancelled = false;

    if (!resolvedCourseId) {
      setLocation("/courses");
      return;
    }

    if (course && courseId === resolvedCourseId) {
      if (questionList.length > 0 || resolvedUnitId) {
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setFetchError(null);
    setCourseId(resolvedCourseId);
    fetchCourseFromApi(resolvedCourseId, true).then((data) => {
      if (cancelled) return;
      setCourse(data);
      setCourseId(resolvedCourseId);
      setLoading(false);
    }).catch((err) => {
      if (cancelled) return;
      setFetchError(err instanceof Error ? err.message : "Failed to load questions");
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [resolvedCourseId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading questions...
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
        <Link href={`/student-course${resolvedCourseId ? `?courseId=${resolvedCourseId}` : ""}`}><Button variant="outline">Back to Course</Button></Link>
      </div>
    );
  }

  if (!course) return null;

  const questions = questionList;
  const unitLookup = Array.isArray(course.units) ? course.units : [];

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-amber-600 bg-amber-50 rounded-lg px-4 py-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>No test questions generated for this unit yet.</span>
        </div>
        <Link href={`/student-course${resolvedCourseId ? `?courseId=${resolvedCourseId}` : ""}`}><Button variant="outline">Back to Course</Button></Link>
      </div>
    );
  }

  const resetTest = () => {
    setCurrentQuestionIdx(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setIsFinished(false);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    const q = questions[currentQuestionIdx];
    const isCorrect = parseInt(selectedAnswer) === q.correctIndex;
    if (isCorrect) setScore((s) => s + 1);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((i) => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setIsFinished(true);
      if (resolvedCourseId && questions.length > 0) {
        const testUnitId = questions[0]?.unitId ?? resolvedUnitId ?? 0;
        api.progress.update({
          courseId: resolvedCourseId,
          unitId: testUnitId,
          completed: true,
          score,
          total: questions.length,
        }).then(() => {
          toast({ title: "Test saved", description: "Your progress has been recorded." });
        }).catch(() => {
          toast({ title: "Note", description: "Test completed but progress could not be saved." });
        });
      }
    }
  };

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="shadow-lg border-2 border-primary/20 text-center overflow-hidden">
          <div className="bg-primary/5 py-12 px-6 flex flex-col items-center">
            <div className="w-20 h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-6 shadow-md">
              <Trophy className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Test Complete!</h2>
            <p className="text-muted-foreground text-lg">{course.title}</p>
          </div>

          <CardContent className="p-8 space-y-8">
            <div>
              <div className="text-5xl font-black text-primary mb-2">{score} / {questions.length}</div>
              <div className="text-xl font-medium text-foreground">{percentage}% Score</div>
            </div>

            <div className={`border rounded-xl p-6 text-left ${percentage >= 70 ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100"}`}>
              <h4 className={`font-bold flex items-center gap-2 mb-2 ${percentage >= 70 ? "text-green-900" : "text-amber-900"}`}>
                <CheckCircle2 className={`w-5 h-5 ${percentage >= 70 ? "text-green-600" : "text-amber-600"}`} />
                {percentage >= 70 ? "Great work!" : "Keep reviewing!"}
              </h4>
              <p className={`text-sm leading-relaxed ${percentage >= 70 ? "text-green-800" : "text-amber-800"}`}>
                {percentage >= 70
                  ? `You scored ${percentage}% — strong understanding of the course material.`
                  : `You scored ${percentage}%. Review the units and retake the test to improve your score.`}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Button variant="outline" size="lg" onClick={resetTest} className="gap-2">
                <RotateCcw className="w-4 h-4" /> Retake Test
              </Button>
              <Link href={`/student-course${resolvedCourseId ? `?courseId=${resolvedCourseId}` : ""}`}>
                <Button size="lg" className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back to Course
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = questions[currentQuestionIdx];
  if (!question) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-4">
        <p className="text-muted-foreground">Question not found.</p>
        <Link href={`/student-course${resolvedCourseId ? `?courseId=${resolvedCourseId}` : ""}`}><Button variant="outline">Back to Course</Button></Link>
      </div>
    );
  }
  const questionOptions = Array.isArray(question.options) ? question.options : [];
  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;
  const selectedInt = selectedAnswer !== null ? parseInt(selectedAnswer) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/student-course${resolvedCourseId ? `?courseId=${resolvedCourseId}` : ""}`}>
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-lg font-bold text-foreground">{course.title} — Test</h2>
            <span className="text-sm font-medium text-muted-foreground">
              Question {currentQuestionIdx + 1} of {questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <Card className="shadow-sm border">
        <CardContent className="p-8 md:p-10 space-y-8">
          <div>
            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
              Unit {(unitLookup.findIndex((u: any) => u.id === question.unitId) + 1) || (question.unitId ?? "?")}
            </div>
            <h3 className="text-xl font-semibold leading-snug">{question.question ?? ""}</h3>
          </div>

          <RadioGroup
            value={selectedAnswer || ""}
            onValueChange={(v) => { if (!showResult) setSelectedAnswer(v); }}
            className="space-y-3"
          >
            {questionOptions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No options available for this question.</p>
            ) : (
              questionOptions.map((opt: any, i: number) => {
                let labelClass = "flex-1 p-4 border rounded-lg cursor-pointer transition-colors text-base font-normal";
                if (showResult) {
                  if (i === question.correctIndex) labelClass += " border-green-500 bg-green-50 text-green-900";
                  else if (selectedInt === i) labelClass += " border-red-400 bg-red-50 text-red-900";
                  else labelClass += " border-border text-muted-foreground cursor-default";
                } else {
                  labelClass += selectedAnswer === i.toString()
                    ? " border-primary bg-primary/5 shadow-sm"
                    : " border-border hover:bg-muted/50";
                }

                return (
                  <div key={i} className="flex items-center space-x-3">
                    <RadioGroupItem
                      value={i.toString()}
                      id={`opt-${i}`}
                      className="w-5 h-5 border-2 text-primary"
                      disabled={showResult}
                    />
                    <Label htmlFor={`opt-${i}`} className={labelClass}>
                      <div className="flex items-center justify-between gap-2">
                        <span>{opt}</span>
                        {showResult && i === question.correctIndex && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
                        {showResult && selectedInt === i && i !== question.correctIndex && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                      </div>
                    </Label>
                  </div>
                );
              })
            )}
          </RadioGroup>

          {showResult && question.explanation && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
              <span className="font-bold">Explanation: </span>{question.explanation}
            </div>
          )}

          <div className="pt-4 border-t flex justify-end">
            {!showResult ? (
              <Button size="lg" onClick={handleSubmitAnswer} disabled={selectedAnswer === null} className="px-8">
                Submit Answer
              </Button>
            ) : (
              <Button size="lg" onClick={handleNext} className="px-8 gap-2">
                {currentQuestionIdx < questions.length - 1 ? "Next Question" : "See Results"}
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
