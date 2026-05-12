import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ChevronRight, FileText, Target, ClipboardList, Upload, Check } from "lucide-react";
import { useCourse } from "@/context/CourseContext";

const UNIT_COLORS = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500"];

export default function CourseGeneration() {
  const [, setLocation] = useLocation();
  const { course, filename } = useCourse();

  useEffect(() => {
    if (!course) setLocation("/upload");
  }, [course, setLocation]);

  if (!course) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-0.5">
            <FileText className="w-3.5 h-3.5" />
            <span>{filename}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{course.title}</h2>
        </div>
      </div>

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
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Unit {unit.id}</div>
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
                      {unit.id}
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

      <div className="flex items-center justify-between pt-2">
        <Link href="/upload">
          <Button variant="ghost" className="gap-2">
            <Upload className="w-4 h-4" />
            Upload Different File
          </Button>
        </Link>
        <Link href="/review">
          <Button size="lg" className="gap-2 px-8 shadow-sm">
            Continue to Teacher Review
            <ChevronRight className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
