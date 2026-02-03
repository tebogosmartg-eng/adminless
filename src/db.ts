import Dexie, { Table } from 'dexie';
import { 
  ClassInfo, Learner, AcademicYear, Term, Assessment, AssessmentMark, Activity, Todo, AttendanceRecord, TimetableEntry, LearnerNote, Evidence, Rubric
} from '@/lib/types';

// Extend types for DB storage (flattened structures where necessary)
export interface DBClass extends Omit<ClassInfo, 'learners'> {
  // Learners are stored in separate table
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

    this.version(2).stores({
      academic_years: 'id, closed, name',
      terms: 'id, year_id, name'
    });

    this.version(3).stores({
      attendance: '[learner_id+date], class_id, date'
    });

    this.version(4).stores({
      assessments: 'id, class_id, term_id, [class_id+term_id]'
    });

    this.version(5).stores({
      timetable: 'id, user_id, [day+period]'
    });

    this.version(6).stores({
      learner_notes: 'id, learner_id, date'
    });

    this.version(7).stores({
      academic_years: 'id, user_id, closed, name',
      terms: 'id, user_id, year_id, name',
      assessments: 'id, user_id, class_id, term_id, [class_id+term_id]',
      activities: 'id, user_id, timestamp',
      todos: 'id, user_id, completed',
      learner_notes: 'id, user_id, learner_id, date'
    });

    this.version(8).stores({
      learner_notes: 'id, user_id, learner_id, date, created_at, category'
    });

    this.version(9).stores({
      evidence: 'id, user_id, class_id, term_id, learner_id, category'
    });

    this.version(10).stores({
      evidence: 'id, user_id, class_id, term_id, learner_id, category, created_at'
    });

    this.version(11).stores({
      rubrics: 'id, user_id, title',
      assessment_marks: '[assessment_id+learner_id], assessment_id, learner_id, user_id'
    });
  }
}

export const db = new SmaRegDB();