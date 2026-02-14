import Dexie, { Table } from 'dexie';
import { 
  ClassInfo, Learner, AcademicYear, Term, Assessment, AssessmentMark, Activity, Todo, AttendanceRecord, TimetableEntry, LearnerNote, Evidence, Rubric, ScanHistory
} from '@/lib/types';

export interface LessonLog {
  id: string;
  user_id: string;
  timetable_id: string;
  date: string; 
  content: string;
  homework?: string;
  topic_ids?: string[]; 
  created_at: string;
}

export interface CurriculumTopic {
  id: string;
  user_id: string;
  subject: string;
  grade: string;
  term_id: string;
  title: string;
  description?: string;
  order: number;
}

export interface AssessmentDiagnostic {
  id: string;
  assessment_id: string;
  user_id: string;
  findings: string;
  interventions: string;
  updated_at: string;
}

export interface DBClass extends Omit<ClassInfo, 'learners'> {
  sync_status?: 'synced' | 'pending';
}

export interface DBLearner extends Learner {
  class_id: string;
  sync_status?: 'synced' | 'pending';
}

export interface DBSyncItem {
  id?: number;
  table: string;
  action: 'create' | 'update' | 'delete' | 'upsert';
  data: any;
  timestamp: number;
}

export class SmaRegDB extends Dexie {
  classes!: Table<DBClass>;
  learners!: Table<DBLearner>;
  academic_years!: Table<AcademicYear>;
  terms!: Table<Term>;
  assessments!: Table<Assessment>;
  assessment_marks!: Table<AssessmentMark>;
  activities!: Table<Activity>;
  todos!: Table<Todo>;
  attendance!: Table<AttendanceRecord>;
  sync_queue!: Table<DBSyncItem>;
  profiles!: Table<any>;
  timetable!: Table<TimetableEntry>;
  learner_notes!: Table<LearnerNote>;
  evidence!: Table<Evidence>;
  rubrics!: Table<Rubric>;
  lesson_logs!: Table<LessonLog>;
  curriculum_topics!: Table<CurriculumTopic>;
  diagnostics!: Table<AssessmentDiagnostic>;
  scan_history!: Table<ScanHistory>;

  constructor() {
    super('SmaRegDB');
    
    // Initial schema
    this.version(1).stores({
      classes: 'id, user_id, sync_status',
      learners: 'id, class_id, sync_status', 
      academic_years: 'id, closed',
      terms: 'id, year_id',
      assessments: 'id, class_id, term_id',
      assessment_marks: '[assessment_id+learner_id], assessment_id, learner_id',
      activities: 'id, timestamp',
      todos: 'id, completed',
      sync_queue: '++id, table, timestamp',
      profiles: 'id'
    });

    // Version 21: Added composite keys and user_id for specific tables
    this.version(21).stores({
      assessments: 'id, class_id, term_id, [class_id+term_id], user_id',
      assessment_marks: '[assessment_id+learner_id], id, assessment_id, learner_id, user_id',
      diagnostics: 'id, assessment_id, user_id'
    });

    // Version 22: Universal user_id indexing for all tables to fix KeyPath errors
    this.version(22).stores({
      academic_years: 'id, user_id, closed',
      terms: 'id, year_id, user_id',
      classes: 'id, user_id, term_id, [year_id+term_id], sync_status',
      learners: 'id, class_id, user_id',
      activities: 'id, user_id, term_id, timestamp',
      todos: 'id, user_id, term_id, completed',
      attendance: 'id, user_id, class_id, learner_id, term_id, date, [class_id+date]',
      timetable: 'id, user_id, year_id, day, period',
      learner_notes: 'id, user_id, learner_id, term_id, date',
      evidence: 'id, user_id, class_id, learner_id, term_id',
      rubrics: 'id, user_id',
      lesson_logs: 'id, user_id, timetable_id, date, [timetable_id+date]',
      curriculum_topics: 'id, user_id, term_id, [subject+grade+term_id]',
      diagnostics: 'id, user_id, assessment_id'
    });

    // Version 23: Fix missing indexes for sorting (created_at)
    this.version(23).stores({
      learner_notes: 'id, user_id, learner_id, term_id, date, created_at',
      lesson_logs: 'id, user_id, timetable_id, date, [timetable_id+date], created_at',
      evidence: 'id, user_id, class_id, learner_id, term_id, created_at',
      todos: 'id, user_id, term_id, completed, created_at'
    });

    // Version 24: Added scan_history for audit trail
    this.version(24).stores({
      scan_history: 'id, user_id, class_id, assessment_id, academic_year_id, term_id, timestamp'
    });
  }
}

export const db = new SmaRegDB();