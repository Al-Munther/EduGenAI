import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Layers, FileText, Clock, ChevronRight, Loader2, AlertCircle, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCourse, type GeneratedUnit, type GeneratedQuestion } from "@/context/CourseContext";

export default function StudentCourses() {
  const [, setLocation] = useLocation();
  const { setCourse, setCourseId, setPdfText, setFilename } = useCourse();
  const { data: courses, isLoading, isError } = useQuery({
    queryKey: ["api", "courses", "published"],
    queryFn: () => api.courses.listPublished(),
  });
  console.log(`[CourseLibrary] Published courses from API:`, courses);

  const handleSelectCourse = (course: {
    id: number;
    title: string;
    description: string;
    assessmentPlan: string;
    units: unknown;
    questions: unknown;
    pdfText?: string;
    filename?: string;
  }) => {
    setCourse({
      title: course.title,
      description: course.description,
      assessmentPlan: course.assessmentPlan || "",
      units: (course.units || []) as GeneratedUnit[],
      questions: (course.questions || []) as GeneratedQuestion[],
    });
    setCourseId(course.id);
    setPdfText(course.pdfText || "");
    setFilename(course.filename || "");
    setLocation("/student-course");
  };

  const courseList = courses ?? [];
  console.log(`[CourseLibrary] Normalized course list (${courseList.length} courses):`, courseList.map((c: any) => ({ id: c.id, title: c.title, status: c.status })));

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Course Library</h2>
          <p className="text-muted-foreground mt-0.5">Select a course to begin studying.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading published courses...
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg px-4 py-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Failed to load courses. Please check your connection.
        </div>
      ) : courseList.length === 0 ? (
        <Card className="border-dashed border-2 border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h4 className="font-semibold text-foreground text-lg mb-2">No published courses available yet</h4>
            <p className="text-sm text-muted-foreground max-w-xs">
              Ask your professor to publish a course. Published courses will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courseList.map((course: any) => {
            const unitCount = (course.units as unknown[])?.length ?? 0;
            const questionCount = (course.questions as unknown[])?.length ?? 0;

            return (
              <Card
                key={course.id}
                className="shadow-sm border hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => handleSelectCourse(course)}
              >
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{course.title}</h4>
                      <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{course.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" /> {unitCount} units
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> {questionCount} questions
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(course.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <Button className="w-full gap-2 mt-1" size="sm" onClick={(e) => { e.stopPropagation(); handleSelectCourse(course); }}>
                    Start Course <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
