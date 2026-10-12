const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    headers: options?.body instanceof FormData ? {} : { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  health: () => request<{ status: string; ollama: string }>("/api/healthz"),

  courses: {
    listAll: () => request<any[]>("/api/courses"),
    list: (teacherId = 1) => request<any[]>(`/api/courses/teacher/${teacherId}`),
    listPublished: () => request<any[]>("/api/courses/published"),
    get: (id: number) => request<any>(`/api/courses/${id}`),
    create: (data: { title: string; description?: string }) =>
      request<any>("/api/courses", { method: "POST", body: JSON.stringify(data) }),
    publish: (courseId: number, data?: object) =>
      request<any>(`/api/courses/${courseId}/publish`, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
    delete: (courseId: number) =>
      request<void>(`/api/courses/${courseId}`, { method: "DELETE" }),
    process: (courseId: number) =>
      request<any>(`/api/courses/${courseId}/process`, { method: "POST" }),
    generate: (courseId: number) =>
      request<any>(`/api/courses/${courseId}/generate`, { method: "POST" }),
    getStatus: (courseId: number) => request<any>(`/api/courses/${courseId}`),
  },

  files: {
    upload: (courseId: number, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return request<any>(`/api/courses/${courseId}/upload`, {
        method: "POST",
        body: formData,
      });
    },
    list: (courseId: number) => request<any[]>(`/api/courses/${courseId}/files`),
  },

  review: {
    getUnits: (courseId: number) => request<any[]>(`/api/courses/${courseId}/units`),
    getQuestions: (courseId: number) => request<any[]>(`/api/courses/${courseId}/questions`),
    getUnitQuestions: (courseId: number, unitId: number) => request<any[]>(`/api/courses/${courseId}/units/${unitId}/questions`),
    approveCourse: (courseId: number) =>
      request<any>(`/api/courses/${courseId}/approve`, { method: "PUT" }),
    approveUnit: (courseId: number, unitId: number) =>
      request<any>(`/api/courses/${courseId}/units/${unitId}/approve`, { method: "PUT" }),
    approveQuestion: (courseId: number, questionId: number) =>
      request<any>(`/api/courses/${courseId}/questions/${questionId}/approve`, { method: "PUT" }),
    regenerateUnit: (courseId: number, unitId: number, teacherInstruction?: string) =>
      request<any>(`/api/courses/${courseId}/units/${unitId}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ teacherInstruction }),
      }),
    regenerateQuestion: (courseId: number, questionId: number, teacherInstruction?: string) =>
      request<any>(`/api/courses/${courseId}/questions/${questionId}/regenerate`, {
        method: "POST",
        body: JSON.stringify({ teacherInstruction }),
      }),
  },

  progress: {
    get: (courseId: number, studentId = 2) =>
      request<any[]>(`/api/progress/${courseId}?studentId=${studentId}`),
    update: (data: { courseId: number; unitId: number; completed: boolean; score?: number | null; total?: number | null }) =>
      request<any>("/api/progress", { method: "PUT", body: JSON.stringify(data) }),
  },

  tests: {
    submitAttempt: (courseId: number, data: { unitId: number; answers: any[]; score: number; total: number }) =>
      request<any>(`/api/tests/${courseId}/attempts`, { method: "POST", body: JSON.stringify(data) }),
    getAttempts: (courseId: number, studentId = 2) =>
      request<any[]>(`/api/tests/${courseId}/attempts?studentId=${studentId}`),
  },
};
