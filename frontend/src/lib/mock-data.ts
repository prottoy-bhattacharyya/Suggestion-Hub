export type PdfType = "note" | "suggestion";
export type Status = "pending" | "approved" | "rejected";

export interface User {
  id: string;
  name: string;
  studentId: string;
  department: string;
  courses: string[];
  intake: string;
  section: string;
  role: "student" | "teacher" | "admin";
  followers: number;
  following: number;
}

export interface Pdf {
  id: string;
  title: string;
  description: string;
  course: string;
  intake: string;
  section: string;
  type: PdfType;
  uploaderId: string;
  date: string;
  rating: number;
  ratingCount: number;
  pages: number;
  status: Status;
  rejectReason?: string;
  claimedBy?: string;
}

export const currentUserId = "u1";

export const users: User[] = [
  { id: "u1", name: "Prottoy Vhattacharyya", studentId: "22101045", department: "CSE", courses: ["CSE220", "CSE221"], intake: "49", section: "3", role: "student", followers: 128, following: 42 },
  { id: "u2", name: "Tanvir Hasan", studentId: "22101012", department: "CSE", courses: ["CSE220"], intake: "49", section: "1", role: "student", followers: 310, following: 18 },
  { id: "u3", name: "Mahin Rahman", studentId: "22201088", department: "CSE", courses: ["CSE221", "CSE230"], intake: "48", section: "2", role: "student", followers: 76, following: 55 },
  { id: "u4", name: "Sadia Akter", studentId: "22301033", department: "EEE", courses: ["EEE201"], intake: "49", section: "4", role: "student", followers: 54, following: 21 },
  { id: "t1", name: "Dr. Farhana Karim", studentId: "—", department: "CSE", courses: ["CSE220", "CSE221"], intake: "—", section: "—", role: "teacher", followers: 0, following: 0 },
  { id: "a1", name: "Admin Office", studentId: "—", department: "—", courses: [], intake: "—", section: "—", role: "admin", followers: 0, following: 0 },
];

export const courses = [
  { code: "CSE220", name: "Data Structures", teachers: ["t1"] },
  { code: "CSE221", name: "Algorithms", teachers: ["t1"] },
  { code: "CSE230", name: "Discrete Mathematics", teachers: [] },
  { code: "EEE201", name: "Electrical Circuits II", teachers: [] },
];

export const pdfs: Pdf[] = [
  { id: "p1", title: "AVL Trees — rotations explained with diagrams", description: "Step-by-step LL, RR, LR, RL rotations with 12 worked examples.", course: "CSE220", intake: "49", section: "1", type: "note", uploaderId: "u2", date: "2026-10-24", rating: 4.8, ratingCount: 61, pages: 14, status: "approved" },
  { id: "p2", title: "Midterm suggestion: Heaps & Priority Queues", description: "Likely questions from past 4 semesters, with short answers.", course: "CSE220", intake: "49", section: "3", type: "suggestion", uploaderId: "u2", date: "2026-10-22", rating: 4.5, ratingCount: 38, pages: 6, status: "approved" },
  { id: "p3", title: "Dynamic Programming patterns cheat-sheet", description: "Knapsack, LCS, LIS, matrix chain — recurrence + table templates.", course: "CSE221", intake: "48", section: "2", type: "note", uploaderId: "u3", date: "2026-10-20", rating: 4.6, ratingCount: 44, pages: 9, status: "approved" },
  { id: "p4", title: "Graph traversal lecture notes (BFS/DFS)", description: "Clean handwritten notes, OCR'd and searchable.", course: "CSE221", intake: "49", section: "3", type: "note", uploaderId: "u3", date: "2026-10-18", rating: 4.1, ratingCount: 19, pages: 22, status: "approved" },
  { id: "p5", title: "Thevenin & Norton — solved problems", description: "20 solved circuit problems for the final.", course: "EEE201", intake: "49", section: "4", type: "suggestion", uploaderId: "u4", date: "2026-10-15", rating: 3.9, ratingCount: 12, pages: 11, status: "approved" },
  { id: "p6", title: "Hash tables & collision resolution", description: "Chaining vs open addressing with complexity analysis.", course: "CSE220", intake: "49", section: "3", type: "note", uploaderId: "u1", date: "2026-10-25", rating: 0, ratingCount: 0, pages: 8, status: "pending" },
  { id: "p7", title: "Final suggestion: Sorting algorithms", description: "Merge, quick, heap sort derivations.", course: "CSE220", intake: "49", section: "3", type: "suggestion", uploaderId: "u1", date: "2026-10-12", rating: 4.3, ratingCount: 27, pages: 5, status: "approved" },
  { id: "p8", title: "Greedy algorithms rough notes", description: "Activity selection and Huffman.", course: "CSE221", intake: "49", section: "3", type: "note", uploaderId: "u1", date: "2026-10-08", rating: 0, ratingCount: 0, pages: 3, status: "rejected", rejectReason: "Pages 2–3 are illegible; please re-scan at higher resolution." },
  { id: "p9", title: "Red-Black tree insertion cases", description: "All insertion cases with colour-flip diagrams.", course: "CSE220", intake: "49", section: "2", type: "note", uploaderId: "u3", date: "2026-10-25", rating: 0, ratingCount: 0, pages: 10, status: "pending", claimedBy: "t1" },
  { id: "p10", title: "Master theorem practice set", description: "30 recurrences with solutions.", course: "CSE221", intake: "48", section: "1", type: "suggestion", uploaderId: "u2", date: "2026-10-24", rating: 0, ratingCount: 0, pages: 7, status: "pending" },
];

export const reports = [
  { id: "r1", pdfId: "p5", reason: "Copyright", detail: "Copied directly from textbook solutions manual.", reporter: "u1", date: "2026-10-23" },
  { id: "r2", pdfId: "p4", reason: "Wrong content", detail: "DFS pseudocode on page 7 is incorrect.", reporter: "u2", date: "2026-10-21" },
];

export const reviewLog = [
  { pdfId: "p1", teacher: "t1", decision: "approved", comment: "Accurate and well organised.", date: "2026-10-24" },
  { pdfId: "p8", teacher: "t1", decision: "rejected", comment: "Pages 2–3 are illegible.", date: "2026-10-09" },
];

export const userById = (id: string) => users.find((u) => u.id === id)!;
export const pdfById = (id: string) => pdfs.find((p) => p.id === id);
