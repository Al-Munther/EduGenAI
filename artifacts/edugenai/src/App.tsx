import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import TeacherDashboard from "@/pages/teacher-dashboard";
import PdfUpload from "@/pages/pdf-upload";
import CourseGeneration from "@/pages/course-generation";
import TeacherReview from "@/pages/teacher-review";
import StudentCourse from "@/pages/student-course";
import AiTutor from "@/pages/ai-tutor";
import UnitTest from "@/pages/unit-test";
import { CourseProvider } from "@/context/CourseContext";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={TeacherDashboard} />
        <Route path="/upload" component={PdfUpload} />
        <Route path="/generate" component={CourseGeneration} />
        <Route path="/review" component={TeacherReview} />
        <Route path="/student-course" component={StudentCourse} />
        <Route path="/tutor" component={AiTutor} />
        <Route path="/test" component={UnitTest} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CourseProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </CourseProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
