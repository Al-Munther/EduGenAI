import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Edit2, RotateCcw, Save, Wand2, Globe } from "lucide-react";

interface Unit {
  id: number;
  title: string;
  summary: string;
  isEditing: boolean;
  isRegenerating: boolean;
}

const initialUnits: Unit[] = [
  {
    id: 1,
    title: "Introduction and Basic Concepts",
    summary: "Overview of AI history, definitions, and foundational concepts including machine learning and neural networks.",
    isEditing: false,
    isRegenerating: false,
  },
  {
    id: 2,
    title: "Core Topics and Examples",
    summary: "Deep dive into supervised, unsupervised, and reinforcement learning with practical examples.",
    isEditing: false,
    isRegenerating: false,
  },
  {
    id: 3,
    title: "Practical Application",
    summary: "Hands-on application of AI concepts including model training, evaluation metrics, and real-world use cases.",
    isEditing: false,
    isRegenerating: false,
  },
  {
    id: 4,
    title: "Review and Assessment",
    summary: "Comprehensive review of all units with practice questions and exam preparation strategies.",
    isEditing: false,
    isRegenerating: false,
  }
];

export default function TeacherReview() {
  const [, setLocation] = useLocation();
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [editData, setEditData] = useState<{title: string, summary: string}>({ title: "", summary: "" });
  const [allApproved, setAllApproved] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const startEdit = (unit: Unit) => {
    setEditData({ title: unit.title, summary: unit.summary });
    setUnits(units.map(u => u.id === unit.id ? { ...u, isEditing: true } : u));
  };

  const saveEdit = (id: number) => {
    setUnits(units.map(u => 
      u.id === id ? { ...u, title: editData.title, summary: editData.summary, isEditing: false } : u
    ));
  };

  const regenerateUnit = (id: number) => {
    setUnits(units.map(u => u.id === id ? { ...u, isRegenerating: true } : u));
    setTimeout(() => {
      setUnits(units.map(u => 
        u.id === id ? { 
          ...u, 
          isRegenerating: false, 
          summary: u.summary + " (Enhanced with more specific practical examples from the text.)" 
        } : u
      ));
    }, 1500);
  };

  const handleApproveAll = () => {
    setAllApproved(true);
  };

  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setLocation("/student-course");
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Review Content</h2>
          <p className="text-muted-foreground mt-1">Review, edit, or regenerate the AI-generated course units before publishing.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 bg-background">
            <RotateCcw className="w-4 h-4" />
            Regenerate All
          </Button>
          <Button 
            variant={allApproved ? "secondary" : "default"} 
            className="gap-2"
            onClick={handleApproveAll}
            disabled={allApproved}
          >
            <CheckCircle2 className="w-4 h-4" />
            {allApproved ? "Approved" : "Approve All"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {units.map((unit, index) => (
          <Card key={unit.id} className={`shadow-sm overflow-hidden border-l-4 ${allApproved ? 'border-l-green-500' : 'border-l-primary'}`}>
            <CardContent className="p-6">
              {unit.isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Unit Title</label>
                    <Input 
                      value={editData.title} 
                      onChange={(e) => setEditData({...editData, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Unit Summary</label>
                    <Textarea 
                      value={editData.summary}
                      onChange={(e) => setEditData({...editData, summary: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setUnits(units.map(u => u.id === unit.id ? { ...u, isEditing: false } : u))}>
                      Cancel
                    </Button>
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
                    {unit.isRegenerating ? (
                      <div className="h-10 flex items-center text-muted-foreground text-sm gap-2">
                        <Wand2 className="w-4 h-4 animate-bounce text-primary" />
                        Regenerating content...
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm leading-relaxed">{unit.summary}</p>
                    )}
                  </div>
                  
                  <div className="flex md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-4 min-w-[140px]">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start gap-2"
                      onClick={() => startEdit(unit)}
                      disabled={unit.isRegenerating}
                    >
                      <Edit2 className="w-4 h-4" /> Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start gap-2"
                      onClick={() => regenerateUnit(unit.id)}
                      disabled={unit.isRegenerating}
                    >
                      <RotateCcw className="w-4 h-4" /> Regenerate
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-card border rounded-xl p-8 flex flex-col items-center text-center shadow-sm mt-8">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
          <Globe className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold mb-2">Ready to go live?</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Publishing will make this course available to your students and activate the AI Tutor for them.
        </p>
        <Button 
          size="lg" 
          className="px-10 gap-2 shadow-md w-full sm:w-auto"
          onClick={handlePublish}
          disabled={!allApproved || isPublishing}
        >
          {isPublishing ? "Publishing..." : "Publish Course"}
        </Button>
        {!allApproved && (
          <p className="text-sm text-amber-600 mt-3 font-medium">Please approve all content before publishing.</p>
        )}
      </div>
    </div>
  );
}
