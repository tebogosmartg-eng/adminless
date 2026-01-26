export interface Learner {
  name: string;
  mark: string;
  comment?: string;
  id?: string; // Optional ID for database tracking
}

export interface ClassInfo {
  id: string;
  grade: string;
  subject: string;
  className: string;
  learners: Learner[];
  archived?: boolean;
  notes?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id?: string;
  learner_id: string;
  status: AttendanceStatus;
  date?: string;
  user_id?: string;
}

export interface GradeSymbol {
  id: string;
  min: number;
  max: number;
  symbol: string;
  level: number;
  color: string; // Tailwind color class for text
  badgeColor: string; // Tailwind color class for badge background
}

export interface ScannedLearner {
  name: string;
  mark: string;
}

export interface ScannedDetails {
  subject: string;
  testNumber: string;
  grade: string;
  date: string;
}

export interface Activity {
  id: string;
  timestamp: string;
  message: string;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export interface AggregatedLearner {
  name: string;
  marks: { [classId: string]: number | null };
  finalMark: number;
}

export interface ClassInsight {
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
}

export interface LearnerComment {
  name: string;
  comment: string;
}

export interface GeminiScanResult {
  details: ScannedDetails | null;
  learners: ScannedLearner[];
}