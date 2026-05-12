import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, RotateCcw, Trophy } from "lucide-react";

interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

const questions: Question[] = [
  {
    id: 1,
    text: "What is the primary goal of supervised learning?",
    options: [
      "To explore unlabelled data and find hidden structures",
      "To learn a mapping from inputs to outputs based on labeled data",
      "To maximize cumulative rewards through interaction",
      "To reduce the dimensionality of the dataset"
    ],
    correctAnswer: 1
  },
  {
    id: 2,
    text: "Which of the following is a classic example of classification?",
    options: [
      "Predicting tomorrow's temperature",
      "Customer segmentation based on buying behavior",
      "Email spam detection",
      "Teaching a robot to walk"
    ],
    correctAnswer: 2
  },
  {
    id: 3,
    text: "What characterizes unsupervised learning?",
    options: [
      "It requires a large amount of labeled training data",
      "It deals exclusively with unlabeled data to find patterns",
      "It learns from a sequence of actions and rewards",
      "It is only used for continuous value prediction"
    ],
    correctAnswer: 1
  },
  {
    id: 4,
    text: "Which approach is typically used for predicting a continuous value like house prices?",
    options: [
      "Clustering",
      "Classification",
      "Regression",
      "Dimensionality Reduction"
    ],
    correctAnswer: 2
  },
  {
    id: 5,
    text: "Reinforcement learning is best described as:",
    options: [
      "Learning from a teacher who provides exact answers",
      "Finding groups of similar items in a database",
      "An agent learning a policy by receiving rewards or penalties",
      "Compressing data to its most important features"
    ],
    correctAnswer: 2
  }
];

export default function UnitTest() {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    
    const isCorrect = parseInt(selectedAnswer) === questions[currentQuestionIdx].correctAnswer;
    if (isCorrect) setScore(prev => prev + 1);

    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      setIsFinished(true);
    }
  };

  const resetTest = () => {
    setCurrentQuestionIdx(0);
    setSelectedAnswer(null);
    setScore(0);
    setIsFinished(false);
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
            <p className="text-muted-foreground text-lg">Unit 2: Core Topics and Examples</p>
          </div>
          
          <CardContent className="p-8 space-y-8">
            <div>
              <div className="text-5xl font-black text-primary mb-2">{score} / {questions.length}</div>
              <div className="text-xl font-medium text-foreground">{percentage}% Score</div>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-left">
              <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Personalized Feedback
              </h4>
              <p className="text-blue-800 text-sm leading-relaxed">
                Great performance! You scored well on general concepts. You should review Unit 2 briefly because your incorrect answers were related to specific differences between regression and clustering.
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
            <h2 className="text-lg font-bold text-foreground">Unit 2 Test</h2>
            <span className="text-sm font-medium text-muted-foreground">Question {currentQuestionIdx + 1} of {questions.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <Card className="shadow-sm border">
        <CardContent className="p-8 md:p-10 space-y-8">
          <h3 className="text-2xl font-semibold leading-snug">{question.text}</h3>
          
          <RadioGroup 
            value={selectedAnswer || ""} 
            onValueChange={setSelectedAnswer}
            className="space-y-3"
          >
            {question.options.map((opt, i) => (
              <div key={i} className="flex items-center space-x-3">
                <RadioGroupItem 
                  value={i.toString()} 
                  id={`opt-${i}`}
                  className="w-5 h-5 border-2 text-primary"
                />
                <Label 
                  htmlFor={`opt-${i}`} 
                  className={`flex-1 p-4 border rounded-lg cursor-pointer transition-colors text-base font-normal hover:bg-muted/50 ${selectedAnswer === i.toString() ? 'border-primary bg-primary/5 shadow-sm' : 'border-border'}`}
                >
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
          
          <div className="pt-6 border-t flex justify-end">
            <Button 
              size="lg" 
              onClick={handleSubmit} 
              disabled={selectedAnswer === null}
              className="px-8"
            >
              {currentQuestionIdx < questions.length - 1 ? "Submit Answer & Continue" : "Finish Test"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
