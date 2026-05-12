import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Edit2, RotateCcw, Save, Globe, Loader2, AlertCircle } from "lucide-react";
import { useCourse, type GeneratedUnit } from "@/context/CourseContext";
import { usePublishCourse } from "@workspace/api-client-react";

interface EditableUnit extends GeneratedUnit {
  isEditing: boolean;
}

export default function TeacherReview() {
  const [, setLocation] = useLocation();
  const { course, pdfText, filename, setCourse, setCourseId } = useCourse();

  const [units, setUnits] = useState<EditableUnit[]>([]);
  const [editData, setEditData] = useState<{ title: string; summary: string }>({ title: "", summary: "" });
  const [allApproved, setAllApproved] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  const publishMutation = usePublishCourse({
    mutation: {
      onSuccess: (saved) => {
        setCourseId(saved.id);
        setPublished(true);
        setTimeout(() => setLocation("/"), 1200);
      },
      onError: () => {
        setPublishError("Failed to publish course. Please try again.");
      },
    },
  });

  useEffect(() => {
    if (!course) { setLocation("/upload"); return; }
    setUnits(course.units.map((u) => ({ ...u, isEditing: false })));
  }, [course, setLocation]);

  if (!course) return null;

  const startEdit = (unit: EditableUnit) => {
    setEditData({ title: unit.title, summary: unit.summary });
    setUnits(units.map((u) => ({ ...u, isEditing: u.id === unit.id })));
  };

  const saveEdit = (id: number) => {
    const updated = units.map((u) =>
      u.id === id ? { ...u, title: editData.title, summary: editData.summary, isEditing: false } : u
    );
    setUnits(updated);
    setCourse({ ...course, units: updated.map(({ isEditing: _, ...rest }) => rest) });
  };

  const cancelEdit = (id: number) => {
    setUnits(units.map((u) => (u.id === id ? { ...u, isEditing: false } : u)));
  };

  const handlePublish = () => {
    setPublishError(null);
    const finalUnits = units.map(({ isEditing: _, ...rest }) => rest);
    publishMutation.mutate({
      data: {
        title: course.title,
        description: course.description,
        assessmentPlan: course.assessmentPlan,
        units: finalUnits,
        questions: course.questions,
        pdfText,
        filename,
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Review Content</h2>
          <p className="text-muted-foreground mt-1">
            Review and edit units for <span className="font-medium text-foreground">{course.title}</span> before publishing.
          </p>
        </div>
        <Button
          variant={allApproved ? "secondary" : "default"}
          className="gap-2"
          onClick={() => setAllApproved(true)}
          disabled={allApproved}
        >
          <CheckCircle2 className="w-4 h-4" />
          {allApproved ? "All Approved" : "Approve All"}
        </Button>
      </div>

      <div className="space-y-4">
        {units.map((unit, index) => (
          <Card
            key={unit.id}
            className={`shadow-sm overflow-hidden border-l-4 ${allApproved ? "border-l-green-500" : "border-l-primary"}`}
          >
            <CardContent className="p-6">
              {unit.isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Unit Title</label>
                    <Input
                      value={editData.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Unit Summary</label>
                    <Textarea
                      value={editData.summary}
                      onChange={(e) => setEditData({ ...editData, summary: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => cancelEdit(unit.id)}>Cancel</Button>
                    <Button size="sm" className="gap-2" onClick={() => saveEdit(unit.id)}>
                      <Save className="w-4 h-4" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-primary mb-1 uppercase tracking-wider">Unit {index + 1}</div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{unit.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{unit.summary}</p>
                    {unit.objectives.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {unit.objectives.slice(0, 3).map((obj, i) => (
                          <span key={i} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full border">
                            {obj}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4 min-w-[120px]">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2"
                      onClick={() => startEdit(unit)}
                    >
                      <Edit2 className="w-4 h-4" /> Edit
                    </Button>
                    {allApproved && (
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

      <div className="bg-card border rounded-xl p-8 flex flex-col items-center text-center shadow-sm">
        {published ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <h3 className="text-xl font-bold text-green-700">Course Published!</h3>
            <p className="text-muted-foreground">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <Globe className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Ready to publish?</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Publishing saves the course to the database and makes it available for students to pick from the course library.
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
              disabled={!allApproved || publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>
              ) : (
                "Publish Course"
              )}
            </Button>
            {!allApproved && (
              <p className="text-sm text-amber-600 mt-3 font-medium">Please approve all content before publishing.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
