import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, MessageCircle, FileQuestion, ChevronRight, CheckCircle2, Circle } from "lucide-react";

export default function StudentCourse() {
  const progress = 25; // Unit 1 complete, Unit 2 starting

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-8 h-[calc(100vh-8rem)]">
      {/* Sidebar Navigation for Course */}
      <div className="w-full lg:w-72 flex-shrink-0 space-y-6">
        <div className="bg-card border rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-foreground mb-4">Course Progress</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm font-medium">
              <span>Unit 2 of 4</span>
              <span className="text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 bg-muted/50 border-b font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Syllabus
          </div>
          <nav className="flex flex-col">
            <button className="flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors border-b">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <div className="font-medium text-foreground text-sm">Unit 1</div>
                <div className="text-xs text-muted-foreground line-clamp-1">Introduction & Concepts</div>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 text-left bg-primary/5 border-l-4 border-l-primary border-b">
              <Circle className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <div className="font-bold text-primary text-sm">Unit 2</div>
                <div className="text-xs text-foreground font-medium line-clamp-1">Core Topics and Examples</div>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors border-b opacity-70">
              <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium text-foreground text-sm">Unit 3</div>
                <div className="text-xs text-muted-foreground line-clamp-1">Practical Application</div>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors opacity-70">
              <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div>
                <div className="font-medium text-foreground text-sm">Unit 4</div>
                <div className="text-xs text-muted-foreground line-clamp-1">Review and Assessment</div>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="border-b px-8 py-6 bg-muted/20">
          <div className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Unit 2</div>
          <h2 className="text-2xl font-bold text-foreground">Core Topics and Examples</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 prose prose-slate max-w-none">
          <p className="text-lg text-muted-foreground leading-relaxed">
            In this unit, we dive deep into the fundamental paradigms of machine learning. Understanding these categories is essential for choosing the right approach to solve specific problems.
          </p>
          
          <h3>Supervised Learning</h3>
          <p>
            Supervised learning is the most common form of machine learning. The model is trained on a labeled dataset, meaning that each training example is paired with an output label. The goal is for the model to learn the mapping function from inputs to outputs so that it can accurately predict the labels for new, unseen data.
          </p>
          <ul>
            <li><strong>Classification:</strong> Predicting a discrete category (e.g., spam detection, image recognition).</li>
            <li><strong>Regression:</strong> Predicting a continuous value (e.g., predicting house prices, temperature forecasting).</li>
          </ul>

          <h3>Unsupervised Learning</h3>
          <p>
            Unlike supervised learning, unsupervised learning deals with unlabeled data. The system tries to learn without a teacher. It explores the data to find hidden structures, patterns, or relationships.
          </p>
          <ul>
            <li><strong>Clustering:</strong> Grouping similar data points together (e.g., customer segmentation).</li>
            <li><strong>Dimensionality Reduction:</strong> Reducing the number of variables while preserving the essential information (e.g., PCA).</li>
          </ul>

          <h3>Reinforcement Learning</h3>
          <p>
            This type of learning relies on an agent interacting with an environment. The agent takes actions and receives feedback in the form of rewards or penalties. The goal is to learn a policy that maximizes the total cumulative reward over time.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-6">
            <h4 className="text-blue-800 font-bold m-0 mb-2">Key Takeaway</h4>
            <p className="text-blue-900 m-0 text-sm">
              The choice of learning algorithm depends entirely on your data (labeled vs. unlabeled) and your objective (predicting a value, finding structure, or maximizing reward).
            </p>
          </div>
        </div>

        <div className="border-t p-6 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/tutor">
            <Button variant="outline" className="gap-2 bg-background">
              <MessageCircle className="w-4 h-4" />
              Open AI Tutor
            </Button>
          </Link>
          <Link href="/test">
            <Button className="gap-2 shadow-sm px-6">
              Start Unit Test
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
