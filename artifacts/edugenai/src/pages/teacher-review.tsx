import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Edit2, RotateCcw, Save, Globe, Loader2, AlertCircle, XCircle, ThumbsUp, Trash2 } from "lucide-react";
import { useCourse, type GeneratedUnit, type GeneratedQuestion, fetchCourseFromApi } from "@/context/CourseContext";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface EditableUnit extends GeneratedUnit {
  isEditing: boolean;
  status?: string;
}

interface EditableQuestion extends GeneratedQuestion {
  status?: string;
  isEditing: boolean;
}

export default function TeacherReview() {
  const [, setLocation] = useLocation();
  const { course, pdfText, filename, courseId, setCourse, setCourseId } = useCourse();
  const queryClient = useQueryClient();

  const [units, setUnits] = useState<EditableUnit[]>([]);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [regeneratingUnit, setRegeneratingUnit] = useState<number | null>(null);
  const [regeneratingQuestion, setRegeneratingQuestion] = useState<number | null>(null);
  const [teacherInstruction, setTeacherInstruction] = useState("");
  const [loading, setLoading] = useState(true);
  const [approvingUnit, setApprovingUnit] = useState<number | null>(null);
  const [approvingQuestion, setApprovingQuestion] = useState<number | null>(null);
  const [approvingCourse, setApprovingCourse] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [courseStatus, setCourseStatus] = useState<string>("");
  const [unitEditData, setUnitEditData] = useState<{ title: string; summary: string }>({ title: "", summary: "" });
  const [qEditData, setQEditData] = useState<{ question: string; options: string[]; correctIndex: number; explanation: string }>({ question: "", options: [], correctIndex: 0, explanation: "" });

  const resolvedCourseId = (() => {
    const urlId = parseInt(new URLSearchParams(window.location.search).get("courseId") || "0") || null;
    return urlId || courseId;
  })();

  const loadData = useCallback(async () => {
    const urlId = parseInt(new URLSearchParams(window.location.search).get("courseId") || "0") || null;
    const effectiveId = urlId || courseId;

    if (course && courseId === effectiveId) {
      setUnits(course.units.map((u) => ({ ...u, isEditing: false })));
      setQuestions(course.questions.map((q) => ({ ...q, isEditing: false })));
      setLoading(false);
      return;
    }
    if (!effectiveId) {
      setLoading(false);
      return;
    }
    try {
      const [courseInfo, data] = await Promise.all([
        api.courses.getStatus(effectiveId),
        fetchCourseFromApi(effectiveId),
      ]);
      setCourseStatus(courseInfo.status || "");
      setCourse(data);
      setCourseId(effectiveId);
      setUnits(data.units.map((u) => ({ ...u, isEditing: false })));
      setQuestions(data.questions.map((q) => ({ ...q, isEditing: false })));
      const unitsWithStatus = await api.review.getUnits(effectiveId);
      const statusMap: Record<number, string> = {};
      const qStatusMap: Record<number, string> = {};
      unitsWithStatus.forEach((u: any) => {
        statusMap[u.id] = u.status;
        if (u.questions) {
          u.questions.forEach((q: any) => {
            qStatusMap[q.id] = q.status;
          });
        }
      });
      setUnits((prev) => prev.map((u) => ({ ...u, status: statusMap[u.id] || "pending_review" })));
      setQuestions((prev) => prev.map((q) => ({ ...q, status: qStatusMap[q.id] || "pending_review" })));
    } catch (err) {
      setPublishError("Failed to load course data.");
    } finally {
      setLoading(false);
    }
  }, [course, resolvedCourseId, setCourse, setCourseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading course data...
      </div>
    );
  }

  if (!course && !resolvedCourseId) {
    return (
      <div className="max-w-4xl mx-auto mt-12 text-center space-y-4">
        <p className="text-muted-foreground">No course selected. Please upload and generate a course first.</p>
        <Button onClick={() => setLocation("/upload")}>Go to Upload</Button>
      </div>
    );
  }

  const allUnitsApproved = units.every((u) => u.status === "approved");
  const allQuestionsApproved = questions.every((q) => q.status === "approved");
  const allContentApproved = allUnitsApproved && allQuestionsApproved;
  const isCourseApproved = courseStatus === "approved";
  const canPublish = isCourseApproved;
  const showApproveCourse = allContentApproved && !isCourseApproved;

  const startUnitEdit = (unit: EditableUnit) => {
    setUnitEditData({ title: unit.title, summary: unit.summary });
    setUnits(units.map((u) => ({ ...u, isEditing: u.id === unit.id })));
  };

  const saveUnitEdit = (id: number) => {
    const updated = units.map((u) =>
      u.id === id ? { ...u, title: unitEditData.title, summary: unitEditData.summary, isEditing: false } : u
    );
    setUnits(updated);
    setCourse({ ...course!, units: updated.map(({ isEditing: _, status: __, ...rest }) => rest), questions: questions.map(({ isEditing: _, status: __, ...rest }) => rest) });
  };

  const cancelUnitEdit = (id: number) => {
    setUnits(units.map((u) => (u.id === id ? { ...u, isEditing: false } : u)));
  };

  const startQEdit = (q: EditableQuestion) => {
    setQEditData({ question: q.question, options: [...q.options], correctIndex: q.correctIndex, explanation: q.explanation });
    setQuestions(questions.map((x) => ({ ...x, isEditing: x.id === q.id })));
  };

  const saveQEdit = (id: number) => {
    const updated = questions.map((q) =>
      q.id === id ? { ...q, question: qEditData.question, options: qEditData.options, correctIndex: qEditData.correctIndex, explanation: qEditData.explanation, isEditing: false } : q
    );
    setQuestions(updated);
    setCourse({ ...course!, units: units.map(({ isEditing: _, status: __, ...rest }) => rest), questions: updated.map(({ isEditing: _, status: __, ...rest }) => rest) });
  };

  const cancelQEdit = (id: number) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, isEditing: false } : q)));
  };

  const handleQOptionChange = (index: number, value: string) => {
    const newOptions = [...qEditData.options];
    newOptions[index] = value;
    setQEditData({ ...qEditData, options: newOptions });
  };

  const handleRegenerateUnit = async (unit: EditableUnit) => {
    if (!resolvedCourseId) return;
    setRegeneratingUnit(unit.id);
    try {
      const updated = await api.review.regenerateUnit(resolvedCourseId, unit.id, teacherInstruction || undefined);
      const newUnits = units.map((u) =>
        u.id === unit.id ? { ...u, title: updated.title, summary: updated.description || "", content: updated.content, isEditing: false, status: "pending_review" } : u
      );
      setUnits(newUnits);
      setCourse({ ...course!, units: newUnits.map(({ isEditing: _, status: __, ...rest }) => rest), questions: questions.map(({ isEditing: _, status: __, ...rest }) => rest) });
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegeneratingUnit(null);
      setTeacherInstruction("");
    }
  };

  const handleRegenerateQuestion = async (q: EditableQuestion) => {
    if (!resolvedCourseId) return;
    setRegeneratingQuestion(q.id);
    try {
      const updated = await api.review.regenerateQuestion(resolvedCourseId, q.id, teacherInstruction || undefined);
      const options: string[] = updated.options || [];
      let correctIndex = 0;
      if (updated.correctAnswer !== undefined && updated.correctAnswer !== null) {
        const parsed = parseInt(updated.correctAnswer, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < options.length) {
          correctIndex = parsed;
        } else {
          const found = options.indexOf(updated.correctAnswer);
          if (found !== -1) correctIndex = found;
        }
      }
      const newQuestions = questions.map((x) =>
        x.id === q.id ? { ...x, question: updated.question, options, correctIndex, explanation: updated.explanation || "", isEditing: false, status: "pending_review" } : x
      );
      setQuestions(newQuestions);
      setCourse({ ...course!, units: units.map(({ isEditing: _, status: __, ...rest }) => rest), questions: newQuestions.map(({ isEditing: _, status: __, ...rest }) => rest) });
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegeneratingQuestion(null);
      setTeacherInstruction("");
    }
  };

  const handleApproveUnit = async (unitId: number) => {
    if (!resolvedCourseId) return;
    setApprovingUnit(unitId);
    try {
      await api.review.approveUnit(resolvedCourseId, unitId);
      setUnits(units.map((u) => (u.id === unitId ? { ...u, status: "approved" } : u)));
    } catch (err) {
      setPublishError("Failed to approve unit.");
    } finally {
      setApprovingUnit(null);
    }
  };

  const handleApproveQuestion = async (questionId: number) => {
    if (!resolvedCourseId) return;
    setApprovingQuestion(questionId);
    try {
      await api.review.approveQuestion(resolvedCourseId, questionId);
      setQuestions(questions.map((q) => (q.id === questionId ? { ...q, status: "approved" } : q)));
    } catch (err) {
      setPublishError("Failed to approve question.");
    } finally {
      setApprovingQuestion(null);
    }
  };

  const handleApproveAllContent = async () => {
    if (!resolvedCourseId) return;
    for (const u of units) {
      if (u.status !== "approved") {
        try { await api.review.approveUnit(resolvedCourseId, u.id); } catch {}
      }
    }
    for (const q of questions) {
      if (q.status !== "approved") {
        try { await api.review.approveQuestion(resolvedCourseId, q.id); } catch {}
      }
    }
    setUnits(units.map((u) => ({ ...u, status: "approved" })));
    setQuestions(questions.map((q) => ({ ...q, status: "approved" })));
  };

  const handleApproveCourse = async () => {
    if (!resolvedCourseId) return;
    setApprovingCourse(true);
    try {
      await api.review.approveCourse(resolvedCourseId);
      setCourseStatus("approved");
      setPublishError(null);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Failed to approve course.");
    } finally {
      setApprovingCourse(false);
    }
  };

  const handlePublish = async () => {
    if (!resolvedCourseId) return;
    setPublishError(null);
    setPublishing(true);
    try {
      const finalUnits = units.map(({ isEditing: _, status: __, ...rest }) => rest);
      const finalQuestions = questions.map(({ isEditing: _, status: __, ...rest }) => rest);
      console.log(`[Publish] Publishing course ${resolvedCourseId}...`);
      const result = await api.courses.publish(resolvedCourseId, {
        units: finalUnits,
        questions: finalQuestions,
        assessmentPlan: course?.assessmentPlan || "",
      });
      console.log(`[Publish] Success — course status:`, result?.status);
      setPublishing(false);
      setPublished(true);
      toast({
        title: "Course Published",
        description: "Your course is now available to students.",
      });
      queryClient.invalidateQueries({ queryKey: ["api", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["api", "courses", "published"] });
      setTimeout(() => setLocation("/"), 1200);
    } catch (err) {
      console.error(`[Publish] Failed:`, err);
      setPublishing(false);
      setPublishError(err instanceof Error ? err.message : "Failed to publish course.");
    }
  };

  const handleDeleteQuestion = (qId: number) => {
    setQuestions(questions.filter((q) => q.id !== qId));
    setCourse({ ...course!, units: units.map(({ isEditing: _, status: __, ...rest }) => rest), questions: questions.filter((q) => q.id !== qId).map(({ isEditing: _, status: __, ...rest }) => rest) });
  };

  const getCourseStatusBadge = () => {
    if (published) return { label: "Published", color: "text-green-700 bg-green-50 border-green-200" };
    if (isCourseApproved) return { label: "Approved", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (allContentApproved) return { label: "Content Approved", color: "text-teal-700 bg-teal-50 border-teal-200" };
    return { label: "Review Pending", color: "text-amber-700 bg-amber-50 border-amber-200" };
  };

  const statusBadge = getCourseStatusBadge();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Review Content</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge.color}`}>
              {statusBadge.label}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Review and edit units for <span className="font-medium text-foreground">{course?.title || "Course"}</span> before publishing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleApproveAllContent}
            disabled={allContentApproved}
          >
            <CheckCircle2 className="w-4 h-4" />
            {allContentApproved ? "All Content Approved" : "Approve All Content"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {units.map((unit, index) => (
          <Card
            key={unit.id}
            className={`shadow-sm overflow-hidden border-l-4 ${unit.status === "approved" ? "border-l-green-500" : "border-l-amber-500"}`}
          >
            <CardContent className="p-6">
              {unit.isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Unit Title</label>
                    <Input
                      value={unitEditData.title}
                      onChange={(e) => setUnitEditData({ ...unitEditData, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Unit Summary</label>
                    <Textarea
                      value={unitEditData.summary}
                      onChange={(e) => setUnitEditData({ ...unitEditData, summary: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => cancelUnitEdit(unit.id)}>Cancel</Button>
                    <Button size="sm" className="gap-2" onClick={() => saveUnitEdit(unit.id)}>
                      <Save className="w-4 h-4" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-sm font-semibold text-primary uppercase tracking-wider">Unit {index + 1}</div>
                      {unit.status === "approved" ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">Approved</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">Pending Review</span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{unit.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{unit.summary}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {questions.filter((q) => q.unitId === unit.id).length} questions
                    </div>
                  </div>
                  <div className="flex md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4 min-w-[140px]">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => startUnitEdit(unit)}
                    >
                      <Edit2 className="w-4 h-4" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2 text-amber-600 hover:text-amber-700"
                      onClick={() => handleRegenerateUnit(unit)}
                      disabled={regeneratingUnit === unit.id}
                    >
                      {regeneratingUnit === unit.id ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Regenerating...</>
                      ) : (
                        <><RotateCcw className="w-4 h-4" /> Regenerate</>
                      )}
                    </Button>
                    {unit.status !== "approved" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2 text-green-600 hover:text-green-700"
                        onClick={() => handleApproveUnit(unit.id)}
                        disabled={approvingUnit === unit.id}
                      >
                        {approvingUnit === unit.id ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Approving...</>
                        ) : (
                          <><ThumbsUp className="w-4 h-4" /> Approve</>
                        )}
                      </Button>
                    )}
                    {unit.status === "approved" && (
                      <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium pt-1">
                        <CheckCircle2 className="w-4 h-4" /> Approved
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!allContentApproved && (
        <div className="bg-muted/30 border rounded-lg p-4">
          <label className="text-sm font-medium mb-2 block">Teacher Instructions for Regeneration</label>
          <Textarea
            value={teacherInstruction}
            onChange={(e) => setTeacherInstruction(e.target.value)}
            placeholder="Tell AI what to improve, e.g. make it easier, more practical, more detailed..."
            rows={2}
          />
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-foreground">Questions ({questions.length})</h3>
        {questions.map((q) => (
          <Card key={q.id} className="shadow-sm border">
            {q.isEditing ? (
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Question</label>
                  <Textarea
                    value={qEditData.question}
                    onChange={(e) => setQEditData({ ...qEditData, question: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium mb-1 block">Options</label>
                  {qEditData.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={qEditData.correctIndex === i}
                        onChange={() => setQEditData({ ...qEditData, correctIndex: i })}
                        className="w-4 h-4"
                      />
                      <Input
                        value={opt}
                        onChange={(e) => handleQOptionChange(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Explanation</label>
                  <Textarea
                    value={qEditData.explanation}
                    onChange={(e) => setQEditData({ ...qEditData, explanation: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => cancelQEdit(q.id)}>Cancel</Button>
                  <Button size="sm" className="gap-2" onClick={() => saveQEdit(q.id)}>
                    <Save className="w-4 h-4" /> Save
                  </Button>
                </div>
              </CardContent>
            ) : (
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{q.question}</p>
                    {q.status === "approved" ? (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 font-medium">Approved</span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">Pending</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Unit {q.unitId} | {q.options.length} options | Correct: {q.options[q.correctIndex] || q.correctIndex}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startQEdit(q)}
                    title="Edit question"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    onClick={() => handleRegenerateQuestion(q)}
                    disabled={regeneratingQuestion === q.id}
                    title="Regenerate question"
                  >
                    {regeneratingQuestion === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteQuestion(q.id)}
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {q.status !== "approved" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleApproveQuestion(q.id)}
                      disabled={approvingQuestion === q.id}
                      title="Approve question"
                    >
                      {approvingQuestion === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="bg-card border rounded-xl p-8 flex flex-col items-center text-center shadow-sm">
        {published ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <h3 className="text-xl font-bold text-green-700">Course Published!</h3>
            <p className="text-muted-foreground">Students can now access this course.</p>
          </div>
        ) : isCourseApproved ? (
          <>
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <Globe className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Ready to publish?</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              All content has been reviewed and approved. Publishing makes this course available to students.
            </p>
            {publishError && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3 mb-4 w-full max-w-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {publishError}
              </div>
            )}
            <Button
              size="lg"
              className="px-10 gap-2 shadow-md w-full sm:w-auto"
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>
              ) : (
                "Publish Course"
              )}
            </Button>
          </>
        ) : showApproveCourse ? (
          <>
            <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">All Content Approved</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              All units and questions have been approved. Review the course and approve it to enable publishing.
            </p>
            {publishError && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-4 py-3 mb-4 w-full max-w-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {publishError}
              </div>
            )}
            <Button
              size="lg"
              className="px-10 gap-2 shadow-md w-full sm:w-auto bg-teal-600 hover:bg-teal-700"
              onClick={handleApproveCourse}
              disabled={approvingCourse}
            >
              {approvingCourse ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Approving Course...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Approve Course</>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Review Required</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Please review all units and questions above. Approve each item, then you can approve and publish the course.
            </p>
            <p className="text-sm text-amber-600 font-medium">
              {units.length} units, {questions.length} questions — {
                units.filter((u) => u.status === "approved").length
              } units approved, {
                questions.filter((q) => q.status === "approved").length
              } questions approved
            </p>
          </>
        )}
      </div>
    </div>
  );
}
