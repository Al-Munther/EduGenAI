import { createContext, useContext, useState } from "react";

export interface GeneratedUnit {
  id: number;
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
  setCourse: (course: GeneratedCourse) => void;
  setCourseId: (id: number | null) => void;
  setPdfText: (text: string) => void;
  setFilename: (name: string) => void;
  clearCourse: () => void;
}

const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [course, setCourse] = useState<GeneratedCourse | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [pdfText, setPdfText] = useState<string>("");
  const [filename, setFilename] = useState<string>("");

  const clearCourse = () => {
    setCourse(null);
    setCourseId(null);
    setPdfText("");
    setFilename("");
  };

  return (
    <CourseContext.Provider value={{ course, courseId, pdfText, filename, setCourse, setCourseId, setPdfText, setFilename, clearCourse }}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourse must be used within CourseProvider");
  return ctx;
}
