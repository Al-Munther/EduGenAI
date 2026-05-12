import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadCloud, FileText, Loader2, Wand2 } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function PdfUpload() {
  const [, setLocation] = useLocation();
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [options, setOptions] = useState({
    generateUnits: true,
    generateTests: true,
    enableTutor: true,
  });

  const handleSimulateSelect = () => {
    setIsUploading(true);
    setTimeout(() => {
      setFileName("Introduction_to_AI.pdf");
      setIsUploading(false);
    }, 800);
  };

  const handleProcess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setLocation("/generate");
    }, 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Create New Course</h2>
        <p className="text-muted-foreground">Upload your syllabus or lecture notes, and our AI will automatically structure a complete course for you.</p>
      </div>

      <Card className="border-2 border-dashed border-primary/20 shadow-sm overflow-hidden">
        <CardContent className={`p-12 flex flex-col items-center justify-center text-center transition-colors ${fileName ? 'bg-primary/5' : 'bg-background hover:bg-muted/50'}`}>
          {isUploading ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
              <p className="text-muted-foreground font-medium">Uploading file...</p>
            </div>
          ) : fileName ? (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">{fileName}</p>
                <p className="text-sm text-muted-foreground mt-1">Ready for processing</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setFileName(null)} className="mt-4">
                Remove file
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mx-auto">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-lg">Upload syllabus or lecture notes</p>
                <p className="text-sm text-muted-foreground mt-1">Drag and drop your PDF here, or click to browse</p>
              </div>
              <Button onClick={handleSimulateSelect} className="mt-6">
                Browse Files
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
        <h3 className="font-semibold text-lg border-b pb-4">Generation Options</h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="opt1" 
              checked={options.generateUnits}
              onCheckedChange={(c) => setOptions(p => ({...p, generateUnits: !!c}))}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="opt1" className="font-medium text-base">Generate course units</Label>
              <p className="text-sm text-muted-foreground">Extract main topics and create structured learning modules.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="opt2" 
              checked={options.generateTests}
              onCheckedChange={(c) => setOptions(p => ({...p, generateTests: !!c}))}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="opt2" className="font-medium text-base">Generate unit tests</Label>
              <p className="text-sm text-muted-foreground">Create multiple-choice questions to assess student comprehension.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="opt3" 
              checked={options.enableTutor}
              onCheckedChange={(c) => setOptions(p => ({...p, enableTutor: !!c}))}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="opt3" className="font-medium text-base">Enable AI Tutor</Label>
              <p className="text-sm text-muted-foreground">Allow students to chat with an AI restricted to the uploaded material.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          size="lg" 
          disabled={!fileName || isProcessing} 
          onClick={handleProcess}
          className="w-full sm:w-auto px-8 gap-2 shadow-md"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing with AI...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Process with AI
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
