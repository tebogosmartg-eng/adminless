import Dexie, { Table } from 'dexie';
import { 
  ClassInfo, Learner, AcademicYear, Term, Assessment, AssessmentMark, Activity, Todo, AttendanceRecord, TimetableEntry, LearnerNote, Evidence, Rubric
} from '@/lib/types';

export interface LessonLog {
  id: string;
  user_id: string;
  timetable_id: string;
  date: string; 
  content: string;
  homework?: string;
  topic_ids?: string[]; // Link to curriculum topics
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

    this.version(14).stores({
      lesson_logs: 'id, user_id, timetable_id, date, [timetable_id+date]'
    });

    this.version(15).stores({
      curriculum_topics: 'id, user_id, term_id, [subject+grade+term_id]'
    });

    // Version 16: Adding missing indices for complex queries
    this.version(16).stores({
      academic_years: 'id, closed, name',
      terms: 'id, year_id, name',
      activities: 'id, timestamp, term_id',
      todos: 'id, completed, term_id',
      learner_notes: 'id, learner_id, term_id, date, created_at',
      evidence: 'id, class_id, learner_id, term_id, created_at',
      attendance: 'id, class_id, learner_id, term_id, date',
      timetable: 'id, user_id, class_id, day, period',
      assessments: 'id, class_id, term_id, [class_id+term_id]',
      rubrics: 'id, user_id'
    });

    // Version 17: Indexing user_id for activity feed and todo list scoping
    this.version(17).stores({
        activities: 'id, timestamp, term_id, user_id',
        todos: 'id, completed, term_id, user_id'
    });
  }
}

export const db = new SmaRegDB();