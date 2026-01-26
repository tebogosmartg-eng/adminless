export interface Learner {
  name: string;
  mark: string; // Legacy/Current Aggregate
  comment?: string;
  id?: string; 
}

export interface ClassInfo {
  id: string;
  grade: string;
  subject: string;
  className: string;
  learners: Learner[];
  archived?: boolean;
  notes?: string;
  user_id?: string;
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
  color: string; 
  badgeColor: string; 
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

// --- NEW TERM BASED TYPES ---

export interface AcademicYear {
  id: string;
  name: string; // "2024"
  closed: boolean;
}

export interface Term {
  id: string;
  year_id: string;
  name: string; // "Term 1"
  start_date: string | null;
  end_date: string | null;
  closed: boolean;
  weight: number; // Percentage contribution to year mark
}

export interface Assessment {
  id: string;
  class_id: string;
  term_id: string;
  title: string;
  type: string; // "Test", "Exam", "Project", "Assignment"
  max_mark: number;
  weight: number;
  date: string | null;
}

export interface AssessmentMark {
  id: string;
  assessment_id: string;
  learner_id: string;
  score: number | null;
  comment?: string; // Added comment field
}