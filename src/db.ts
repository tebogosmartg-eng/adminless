import Dexie, { Table } from 'dexie';
import { 
  ClassInfo, Learner, AcademicYear, Term, Assessment, AssessmentMark, Activity, Todo, AttendanceRecord, TimetableEntry, LearnerNote, Evidence, Rubric, ScanHistory, RemediationTask, ModerationSample,
  TeacherFileTemplate, TeacherFileTemplateSection, TeacherFileEntry, TeacherFileEntryAttachment, ReviewSnapshot
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

export interface ScanJob {
  id: string;
  user_id: string;
  class_id: string | null;
  assessment_id: string | null;
  file_path: string | null;
  status: string;
  raw_extraction_json: any;
  edited_extraction_json: any;
  created_at: string;
  updated_at: string;
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
  moderation_samples!: Table<ModerationSample>;
  scan_jobs!: Table<ScanJob>;
  
  teacherfile_templates!: Table<TeacherFileTemplate>;
  teacherfile_template_sections!: Table<TeacherFileTemplateSection>;
  teacherfile_entries!: Table<TeacherFileEntry>;
  teacherfile_entry_attachments!: Table<TeacherFileEntryAttachment>;
  review_snapshots!: Table<ReviewSnapshot>;

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

    this.version(40).stores({
      academic_years: 'id, user_id, closed',
      terms: 'id, year_id, user_id',
      classes: 'id, user_id, term_id, [year_id+term_id], sync_status',
      learners: 'id, class_id, user_id',
      activities: 'id, user_id, term_id, timestamp',
      todos: 'id, user_id, term_id, completed',
      attendance: 'id, user_id, class_id, learner_id, term_id, date, [class_id+date]',
      timetable: 'id, user_id, year_id, day, period',
      learner_notes: 'id, user_id, learner_id, term_id, date, created_at',
      evidence: 'id, user_id, class_id, learner_id, term_id, created_at',
      rubrics: 'id, user_id',
      lesson_logs: 'id, user_id, timetable_id, date, [timetable_id+date]',
      curriculum_topics: 'id, user_id, term_id, [subject+grade+term_id]',
      diagnostics: 'id, user_id, assessment_id',
      teacher_file_annotations: 'id, user_id, academic_year_id, term_id, section_key',
      teacher_file_attachments: 'id, user_id, [academic_year_id+term_id+section_key], term_id, section_key',
      assessments: 'id, class_id, term_id, [class_id+term_id], user_id, task_slot_key',
      remediation_tasks: 'id, user_id, class_id, term_id, assessment_id, created_at',
      scan_history: 'id, user_id, class_id, assessment_id, timestamp',
      moderation_samples: 'id, user_id, term_id, [academic_year_id+term_id+class_id]',
      scan_jobs: 'id, user_id, class_id, assessment_id',
      teacherfile_templates: 'id, user_id, [class_id+term_id]',
      teacherfile_template_sections: 'id, template_id, sort_order',
      teacherfile_entries: 'id, user_id, [class_id+term_id], section_id',
      teacherfile_entry_attachments: 'id, entry_id',
      review_snapshots: 'id, user_id, [class_id+term_id], created_at',
      sync_queue: '++id, table, timestamp',
      profiles: 'id'
    });

    // Version 41: Added 'class_id' to timetable index
    this.version(41).stores({
      academic_years: 'id, user_id, closed',
      terms: 'id, year_id, user_id',
      classes: 'id, user_id, term_id, [year_id+term_id], sync_status',
      learners: 'id, class_id, user_id',
      activities: 'id, user_id, term_id, timestamp',
      todos: 'id, user_id, term_id, completed',
      attendance: 'id, user_id, class_id, learner_id, term_id, date, [class_id+date]',
      timetable: 'id, user_id, year_id, day, period, class_id',
      learner_notes: 'id, user_id, learner_id, term_id, date, created_at',
      evidence: 'id, user_id, class_id, learner_id, term_id, created_at',
      rubrics: 'id, user_id',
      lesson_logs: 'id, user_id, timetable_id, date, [timetable_id+date]',
      curriculum_topics: 'id, user_id, term_id, [subject+grade+term_id]',
      diagnostics: 'id, user_id, assessment_id',
      teacher_file_annotations: 'id, user_id, academic_year_id, term_id, section_key',
      teacher_file_attachments: 'id, user_id, [academic_year_id+term_id+section_key], term_id, section_key',
      assessments: 'id, class_id, term_id, [class_id+term_id], user_id, task_slot_key',
      remediation_tasks: 'id, user_id, class_id, term_id, assessment_id, created_at',
      scan_history: 'id, user_id, class_id, assessment_id, timestamp',
      moderation_samples: 'id, user_id, term_id, [academic_year_id+term_id+class_id]',
      scan_jobs: 'id, user_id, class_id, assessment_id',
      teacherfile_templates: 'id, user_id, [class_id+term_id]',
      teacherfile_template_sections: 'id, template_id, sort_order',
      teacherfile_entries: 'id, user_id, [class_id+term_id], section_id',
      teacherfile_entry_attachments: 'id, entry_id',
      review_snapshots: 'id, user_id, [class_id+term_id], created_at',
      sync_queue: '++id, table, timestamp',
      profiles: 'id'
    });
  }
}

export const db = new SmaRegDB();