import { createContext, useContext, useState } from "react";
import { api } from "@/lib/api";

export interface GeneratedUnit {
  id: number;
  orderIndex: number;
  title: string;
  summary: string;
  content: string;
  objectives: string[];
}

export interface GeneratedQuestion {
  id: number;
  unitId: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface GeneratedCourse {
  title: string;
  description: string;
  assessmentPlan: string;
  units: GeneratedUnit[];
  questions: GeneratedQuestion[];
}

interface CourseContextValue {
  course: GeneratedCourse | null;
  courseId: number | null;
  pdfText: string;
  filename: string;
  processingStatus: string;
  generationStatus: string;
  setCourse: (course: GeneratedCourse) => void;
  setCourseId: (id: number | null) => void;
  setPdfText: (text: string) => void;
  setFilename: (name: string) => void;
  setProcessingStatus: (status: string) => void;
  setGenerationStatus: (status: string) => void;
  clearCourse: () => void;
}

const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [course, setCourse] = useState<GeneratedCourse | null>(null);
  const [courseId, setCourseIdState] = useState<number | null>(null);
  const [pdfText, setPdfText] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [generationStatus, setGenerationStatus] = useState<string>("");

  const clearCourse = () => {
    setCourse(null);
    setCourseIdState(null);
    setPdfText("");
    setFilename("");
    setProcessingStatus("");
    setGenerationStatus("");
  };

  const setCourseId = (id: number | null) => {
    setCourseIdState((prev) => {
      if (prev !== null && id !== null && prev !== id) {
        setCourse(null);
        setPdfText("");
        setFilename("");
        setProcessingStatus("");
        setGenerationStatus("");
      }
      return id;
    });
  };

  return (
    <CourseContext.Provider
      value={{
        course, courseId, pdfText, filename,
        processingStatus, generationStatus,
        setCourse, setCourseId, setPdfText, setFilename,
        setProcessingStatus, setGenerationStatus,
        clearCourse,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourse must be used within CourseProvider");
  return ctx;
}

export async function fetchCourseFromApi(courseId: number, approvedOnly = false): Promise<GeneratedCourse> {
  const courseData = await api.courses.getStatus(courseId);

  let units: any[] = [];
  try {
    const raw = await api.review.getUnits(courseId);
    units = Array.isArray(raw) ? raw : [];
  } catch {
    units = [];
  }

  const allQuestions: GeneratedQuestion[] = [];
  const mappedUnits: GeneratedUnit[] = [];

  for (const u of units) {
    if (!u) continue;
    if (approvedOnly && u.status !== "approved") continue;

    const unitQuestions: any[] = Array.isArray(u.questions) ? u.questions : [];
    for (const q of unitQuestions) {
      if (!q) continue;
      if (approvedOnly && q.status !== "approved") continue;
      const options: string[] = Array.isArray(q.options) ? q.options : [];
      let correctIndex = 0;
      if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
        const parsed = parseInt(q.correctAnswer, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < options.length) {
          correctIndex = parsed;
        } else {
          const found = options.indexOf(q.correctAnswer);
          if (found !== -1) correctIndex = found;
        }
      }
      allQuestions.push({
        id: q.id ?? 0,
        unitId: q.unitId ?? u.id ?? 0,
        question: q.question ?? "",
        options,
        correctIndex,
        explanation: q.explanation ?? "",
      });
    }

    mappedUnits.push({
      id: u.id ?? 0,
      orderIndex: u.orderIndex ?? u.order_index ?? mappedUnits.length,
      title: u.title ?? "",
      summary: u.description ?? u.summary ?? "",
      content: u.content ?? "",
      objectives: Array.isArray(u.objectives) ? u.objectives : [],
    });
  }

  return {
    title: courseData?.title ?? "",
    description: (courseData?.description) ?? "",
    assessmentPlan: (courseData?.assessmentPlan) ?? "",
    units: mappedUnits,
    questions: allQuestions,
  };
}
