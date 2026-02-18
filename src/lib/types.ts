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
  questionMarks?: { num: string; score: string }[];
  attendanceStatus?: AttendanceStatus;
}

export interface ScannedDetails {
  subject: string;
  testNumber: string;
  grade: string;
  date: string;
  narrativeSummary?: string;
  findings?: string;
  interventions?: string;
}

export type ScanType = 
  | 'class_marksheet' 
  | 'individual_script' 
  | 'learner_roster' 
  | 'attendance_register' 
  | 'diagnostic_form' 
  | 'moderation_sample';

export type ScanMode = 'bulk' | 'individual'; 

export interface GeminiScanResult {
  details: ScannedDetails | null;
  learners: ScannedLearner[];
}

export interface Activity {
  id: string;
  user_id: string;
  year_id: string;
  term_id: string;
  message: string;
  timestamp: string;
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

export interface AggregatedLearner {
  name: string;
  marks: { [classId: string]: number | null };
  finalMark: number;
}

export interface AcademicYear {
  id: string;
  name: string; 
  closed: boolean;
  user_id?: string;
}

export interface Term {
  id: string;
  year_id: string;
  name: string; 
  start_date: string | null;
  end_date: string | null;
  closed: boolean; 
  is_finalised: boolean; 
  weight: number; 
  user_id?: string;
}

export interface AssessmentQuestion {
  id: string;
  question_number: string;
  skill_description: string;
  max_mark: number;
}

export interface Assessment {
  id: string;
  class_id: string;
  term_id: string;
  title: string;
  type: string; 
  max_mark: number;
  weight: number;
  date: string | null;
  user_id?: string;
  rubric_id?: string | null; 
  questions?: AssessmentQuestion[]; 
  task_slot_key?: string | null; // Added for Teacher File linking
}

export interface QuestionMark {
  question_id: string;
  score: number | null;
}

export interface AssessmentMark {
  id: string;
  assessment_id: string;
  learner_id: string;
  score: number | null;
  comment?: string;
  rubric_selections?: Record<string, string>; 
  user_id?: string;
  question_marks?: QuestionMark[]; 
}

export interface TimetableEntry {
  id: string;
  user_id?: string;
  year_id: string; 
  day: string; 
  period: number; 
  subject: string;
  class_name: string;
  class_id?: string | null; 
  start_time?: string;
  end_time?: string;
  notes?: string; 
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

export interface RubricLevel {
  id: string;
  label: string; 
  points: number;
  descriptor?: string;
}

export interface RubricCriterion {
  id: string;
  title: string;
  weight: number; 
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

export interface ScanHistory {
  id: string;
  user_id: string;
  class_id: string;
  assessment_id?: string | null;
  academic_year_id: string;
  term_id: string;
  scan_type: string;
  replacement_mode: string;
  timestamp: string;
  status: 'completed' | 'failed';
  file_path?: string;
  before_snapshot: any; 
  after_snapshot: any;  
}

export type CognitiveLevel = 'knowledge' | 'comprehension' | 'application' | 'analysis' | 'evaluation' | 'creation' | 'unknown';

export interface DiagnosticRow {
  id: string;
  question: string;
  performance_summary: string;
  cognitive_level?: CognitiveLevel;
  possible_root_causes: string[];
  targeted_interventions: string[];
}

export interface FullDiagnostic {
  rows: DiagnosticRow[];
  overall_class_themes: string[];
  overall_interventions: string[];
}

export interface RemediationTask {
  id: string;
  user_id: string;
  class_id: string;
  term_id: string;
  assessment_id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
  created_at: string;
}