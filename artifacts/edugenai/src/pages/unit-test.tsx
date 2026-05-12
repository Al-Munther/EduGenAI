import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, RotateCcw, Trophy, XCircle } from "lucide-react";
import { useCourse } from "@/context/CourseContext";
import { useSaveProgress } from "@workspace/api-client-react";

export default function UnitTest() {
  const [, setLocation] = useLocation();
  const { course, courseId } = useCourse();
  const saveProgressMutation = useSaveProgress();

  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!course) { setLocation("/courses"); }
  }, [course, setLocation]);

  if (!course) return null;

  const questions = course.questions;

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <p className="text-muted-foreground">No questions available. Please generate a course first.</p>
        <Link href="/upload"><Button className="mt-4">Go to Upload</Button></Link>
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
      const finalScore = score + (selectedAnswer !== null && parseInt(selectedAnswer) === questions[currentQuestionIdx].correctIndex ? 0 : 0);
      setIsFinished(true);
      if (courseId) {
        saveProgressMutation.mutate({
          data: {
            courseId,
            unitId: 0,
            completed: true,
            score: finalScore,
            total: questions.length,
          },
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
              <Link href="/student-course">
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
  const progress = ((currentQuestionIdx + 1) / questions.length) * 100;
  const selectedInt = selectedAnswer !== null ? parseInt(selectedAnswer) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/student-course">
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
              Unit {question.unitId}
            </div>
            <h3 className="text-xl font-semibold leading-snug">{question.question}</h3>
          </div>

          <RadioGroup
            value={selectedAnswer || ""}
            onValueChange={(v) => { if (!showResult) setSelectedAnswer(v); }}
            className="space-y-3"
          >
            {question.options.map((opt, i) => {
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
            })}
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
