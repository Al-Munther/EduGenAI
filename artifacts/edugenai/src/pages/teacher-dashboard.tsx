import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, BookOpen, Trash2, Clock, FileText, Layers, Loader2, AlertCircle, CheckCircle2, Clock4 } from "lucide-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  published: "text-green-600 bg-green-50 border-green-200",
  draft: "text-gray-600 bg-gray-50 border-gray-200",
  uploaded: "text-blue-600 bg-blue-50 border-blue-200",
  processing: "text-amber-600 bg-amber-50 border-amber-200",
  ready: "text-indigo-600 bg-indigo-50 border-indigo-200",
  generated: "text-violet-600 bg-violet-50 border-violet-200",
  review_pending: "text-amber-600 bg-amber-50 border-amber-200",
  approved: "text-emerald-600 bg-emerald-50 border-emerald-200",
  failed: "text-red-600 bg-red-50 border-red-200",
};

export default function TeacherDashboard() {
  const queryClient = useQueryClient();
  const { data: rawCourses, isLoading, isError } = useQuery({
    queryKey: ["api", "courses"],
    queryFn: () => api.courses.listAll(),
  });
  const courses = rawCourses as any[] | undefined;
  const courseList = courses ?? [];
  console.log(`[Dashboard] Courses loaded: ${courseList.length} courses, statuses:`, courseList.map((c: any) => ({ id: c.id, title: c.title, status: c.status })));
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.courses.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api", "courses"] });
    },
  });

  const handleDelete = (id: number, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    deleteMutation.mutate(id);
  };

  const getStatusBadge = (status: string) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.draft;
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-6 rounded-xl border border-primary/10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back, Dr. Ahmed</h2>
          <p className="text-muted-foreground mt-1">Manage your AI-powered courses and track student progress.</p>
        </div>
        <Link href="/upload">
          <Button className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Create New Course
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Published Courses</p>
              <h3 className="text-2xl font-bold">{courseList.filter((c) => c.status === "published").length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-violet-50 text-violet-600 rounded-lg">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Units</p>
              <h3 className="text-2xl font-bold">
                {courseList.reduce((sum, c) => sum + ((c.units as unknown[])?.length ?? 0), 0)}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Approved</p>
              <h3 className="text-2xl font-bold">
                {courseList.filter((c) => c.status === "approved").length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Your Courses</h3>
          <Link href="/upload">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-3.5 h-3.5" /> New Course
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading courses...
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4" /> Failed to load courses. Make sure the API server is running.
          </div>
        ) : courseList.length === 0 ? (
          <Card className="border-dashed border-2 border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="p-12 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <BookOpen className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-foreground text-lg mb-2">No courses yet</h4>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Upload a PDF — AI will generate a full course from your material using local RAG.
              </p>
              <Link href="/upload">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Create Your First Course
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {courseList.map((course) => (
              <Card key={course.id} className="shadow-sm hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground truncate">{course.title}</h4>
                          {getStatusBadge(course.status)}
                          {course.status === "generated" && (
                            <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-violet-600 bg-violet-50 border-violet-200">
                              generated
                            </span>
                          )}
                          {course.status === "review_pending" && (
                            <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-amber-600 bg-amber-50 border-amber-200">
                              awaiting review
                            </span>
                          )}
                          {course.status === "approved" && (
                            <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-emerald-600 bg-emerald-50 border-emerald-200">
                              approved
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{course.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {(course.units as unknown[])?.length ?? 0} units
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {(course.questions as unknown[])?.length ?? 0} questions
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(course.createdAt).toLocaleDateString()}
                          </span>
                          {course.filename && (
                            <span className="text-primary/70 font-medium truncate max-w-[140px]">
                              {course.filename}
                            </span>
                          )}
                        </div>
                        {course.status === "processing" && course.processingStage && (
                          <div className="flex items-center gap-1.5 mt-2 text-amber-600 text-xs">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Processing: {course.processingStage}
                          </div>
                        )}
                        {course.generationStatus === "generating_units" && (
                          <div className="flex items-center gap-1.5 mt-2 text-violet-600 text-xs">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Generating units...
                          </div>
                        )}
                        {course.status === "failed" && course.processingError && (
                          <div className="flex items-center gap-1.5 mt-2 text-red-600 text-xs">
                            <AlertCircle className="w-3 h-3" />
                            Error: {course.processingError}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(course.status === "published" || course.status === "review_pending" || course.status === "generated" || course.status === "approved") && (
                        <Link href={`/review?courseId=${course.id}`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            Review
                          </Button>
                        </Link>
                      )}
                      {course.status === "published" && (
                        <Link href={`/student-course?courseId=${course.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            Preview
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(course.id, course.title)}
                        disabled={deleteMutation.isPending}
                        title="Delete course"
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
