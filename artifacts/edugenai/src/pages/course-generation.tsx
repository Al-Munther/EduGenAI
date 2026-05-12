import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, BookOpen, Layers, ArrowRight } from "lucide-react";

export default function CourseGeneration() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-6 shadow-md">
          <Sparkles className="w-8 h-8" />
        </div>
        <Badge variant="outline" className="bg-white mb-4 border-primary/20 text-primary">Generation Complete</Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">Introduction to Artificial Intelligence</h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Based on "Introduction_to_AI.pdf", the AI has structured a comprehensive 4-unit course covering foundational concepts, machine learning models, practical applications, and evaluation metrics.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b pb-2">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-semibold">Generated Units</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <Badge className="w-fit mb-2 bg-blue-100 text-blue-700 hover:bg-blue-100 shadow-none">Unit 1</Badge>
              <CardTitle className="text-lg">Introduction and Basic Concepts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Overview of AI history, definitions, and foundational concepts including machine learning and neural networks.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-indigo-500">
            <CardHeader className="pb-3">
              <Badge className="w-fit mb-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 shadow-none">Unit 2</Badge>
              <CardTitle className="text-lg">Core Topics and Examples</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Deep dive into supervised, unsupervised, and reinforcement learning with practical examples.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <Badge className="w-fit mb-2 bg-purple-100 text-purple-700 hover:bg-purple-100 shadow-none">Unit 3</Badge>
              <CardTitle className="text-lg">Practical Application</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hands-on application of AI concepts including model training, evaluation metrics, and real-world use cases.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-emerald-500">
            <CardHeader className="pb-3">
              <Badge className="w-fit mb-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shadow-none">Unit 4</Badge>
              <CardTitle className="text-lg">Review and Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Comprehensive review of all units with practice questions and exam preparation strategies.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Assessment Plan</h3>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          The AI has prepared a 5-question multiple-choice quiz at the end of each unit. The AI Tutor has been successfully grounded using exclusively the uploaded PDF document and will refuse to answer questions outside this scope.
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 20 total assessment questions generated</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> AI Tutor initialized with knowledge base</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Progress tracking enabled</li>
        </ul>
      </div>

      <div className="flex justify-end pt-4">
        <Link href="/review">
          <Button size="lg" className="px-8 gap-2 shadow-md">
            Continue to Teacher Review
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
