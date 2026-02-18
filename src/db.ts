import Dexie, { Table } from 'dexie';
import { 
  ClassInfo, Learner, AcademicYear, Term, Assessment, AssessmentMark, Activity, Todo, AttendanceRecord, TimetableEntry, LearnerNote, Evidence, Rubric, ScanHistory, RemediationTask
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

export interface TeacherFileAnnotation {
  id: string;
  user_id: string;
  academic_year_id: string;
  term_id: string | null;
  section_key: string;
  content: string;
  updated_at: string;
}

export interface TeacherFileAttachment {
  id: string;
  user_id: string;
  academic_year_id: string;
  term_id: string;
  section_key: string;
  class_id?: string | null;
  assessment_id?: string | null;
  file_path: string;
  file_name: string;
  file_type: string;
  created_at: string;
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
  remediation_tasks!: Table<RemediationTask>;
  teacher_file_annotations!: Table<TeacherFileAnnotation>;
  teacher_file_attachments!: Table<TeacherFileAttachment>;

  constructor() {
    super('SmaRegDB');
    
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

    // Version 28: Full schema alignment with remediation and scan auditing
    this.version(28).stores({
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
      diagnostics: 'id, user_id, assessment_id',
      teacher_file_annotations: 'id, user_id, academic_year_id, term_id, section_key',
      teacher_file_attachments: 'id, user_id, [academic_year_id+term_id+section_key], term_id, section_key',
      assessments: 'id, class_id, term_id, [class_id+term_id], user_id, task_slot_key',
      remediation_tasks: 'id, user_id, class_id, term_id, assessment_id',
      scan_history: 'id, user_id, class_id, assessment_id, timestamp'
    });

    // Version 29: Fix for learner_notes created_at indexing
    this.version(29).stores({
      learner_notes: 'id, user_id, learner_id, term_id, date, created_at'
    });

    // Version 30: Fix for timetable class_id indexing
    this.version(30).stores({
      timetable: 'id, user_id, year_id, day, period, class_id'
    });
  }
}

export const db = new SmaRegDB();