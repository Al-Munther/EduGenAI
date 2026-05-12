import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, FileText, Plus, Upload, BookOpen, Clock } from "lucide-react";

export default function TeacherDashboard() {
  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Section */}
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

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Enrolled</p>
              <h3 className="text-2xl font-bold">24</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
              <h3 className="text-2xl font-bold">87%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tests Completed</p>
              <h3 className="text-2xl font-bold">12</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Your Courses</h3>
            <Button variant="ghost" size="sm" className="text-primary">View All</Button>
          </div>
          
          <div className="space-y-3">
            <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Introduction to Machine Learning</h4>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 18 students</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Updated 2d ago</span>
                    </div>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none shadow-none">Published</Badge>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors shadow-sm cursor-pointer">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Data Structures & Algorithms</h4>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 6 students</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Updated 1w ago</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-muted-foreground border-border/80">Draft</Badge>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
          <Card className="border-dashed border-2 border-primary/20 bg-primary/5 shadow-sm text-center">
            <CardContent className="p-8 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">Upload Material</h4>
              <p className="text-sm text-muted-foreground mb-6">Drop a syllabus or lecture notes to auto-generate a course.</p>
              <Link href="/upload">
                <Button variant="outline" className="bg-background w-full">Select File</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
