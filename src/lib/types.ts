export interface Learner {
  name: string;
  mark: string; // Legacy/Current Aggregate
  comment?: string;
  id?: string; 
  class_id?: string;
}

export interface ClassInfo {
  id: string;
  year_id: string;
  term_id: string;
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
  class_id?: string;
  term_id?: string;
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
  user_id: string;
  year_id: string;
  term_id: string;
  timestamp: string;
  message: string;
}

export interface Todo {
  id: string;
  user_id: string;
  year_id: string;
  term_id: string;
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
  user_id?: string;
}

export interface Term {
  id: string;
  year_id: string;
  name: string; // "Term 1"
  start_date: string | null;
  end_date: string | null;
  closed: boolean;
  weight: number; // Percentage contribution to year mark
  user_id?: string;
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
  user_id?: string;
  rubric_id?: string | null; // Link to a rubric
}

export interface AssessmentMark {
  id: string;
  assessment_id: string;
  learner_id: string;
  score: number | null;
  comment?: string;
  rubric_selections?: Record<string, string>; // Maps Criterion ID -> Level ID
  user_id?: string;
}

export interface TimetableEntry {
  id: string;
  user_id?: string;
  day: string; // "Monday", "Tuesday"...
  period: number; // 1, 2, 3...
  subject: string;
  class_name: string;
  class_id?: string | null; // Link to actual ClassInfo if available
  start_time?: string;
  end_time?: string;
}

export interface AssessmentResult {
  termName: string;
  termId: string;
  assessmentTitle: string;
  assessmentType: string;
  date: string;
  score: number | null;
  max: number;
  weight: number;
  percentage: number | null;
  classAverage: number | null;
}

export interface LearnerNote {
  id: string;
  learner_id: string;
  user_id?: string;
  year_id: string;
  term_id: string;
  content: string;
  category: 'behavior' | 'academic' | 'parent' | 'general' | 'positive';
  date: string;
  created_at?: string;
}

// --- EVIDENCE TYPES ---

export interface Evidence {
  id: string;
  user_id?: string;
  class_id: string;
  year_id: string;
  term_id?: string | null;
  learner_id?: string | null;
  file_path: string;
  file_name: string;
  file_type: string;
  category: 'script' | 'moderation' | 'photo' | 'general';
  notes?: string;
  created_at?: string;
}

// --- RUBRIC TYPES ---

export interface RubricLevel {
  id: string;
  label: string; // "Excellent", "Good", etc.
  points: number;
  descriptor?: string;
}

export interface RubricCriterion {
  id: string;
  title: string;
  weight: number; // e.g. 10 points
  levels: RubricLevel[];
}

export interface Rubric {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  criteria: RubricCriterion[];
  total_points: number;
}