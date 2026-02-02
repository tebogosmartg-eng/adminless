import Dexie, { Table } from 'dexie';
import { 
  ClassInfo, Learner, AcademicYear, Term, Assessment, AssessmentMark, Activity, Todo, AttendanceRecord, TimetableEntry, LearnerNote, Evidence
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

  constructor() {
    super('SmaRegDB');
    
    this.version(1).stores({
      classes: 'id, user_id, sync_status',
      learners: 'id, class_id, sync_status', // id is UUID from supabase
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

    // Version 3: Add attendance table
    this.version(3).stores({
      attendance: '[learner_id+date], class_id, date'
    });

    // Version 4: Add compound index for assessments
    this.version(4).stores({
      assessments: 'id, class_id, term_id, [class_id+term_id]'
    });

    // Version 5: Add timetable
    this.version(5).stores({
      timetable: 'id, user_id, [day+period]'
    });

    // Version 6: Add learner notes
    this.version(6).stores({
      learner_notes: 'id, learner_id, date'
    });

    // Version 7: Add user_id index
    this.version(7).stores({
      academic_years: 'id, user_id, closed, name',
      terms: 'id, user_id, year_id, name',
      assessments: 'id, user_id, class_id, term_id, [class_id+term_id]',
      activities: 'id, user_id, timestamp',
      todos: 'id, user_id, completed',
      learner_notes: 'id, user_id, learner_id, date'
    });

    // Version 8: Add learner_notes querying indexes
    this.version(8).stores({
      learner_notes: 'id, user_id, learner_id, date, created_at, category'
    });

    // Version 9: Add Evidence table
    this.version(9).stores({
      evidence: 'id, user_id, class_id, term_id, learner_id, category'
    });
  }
}

export const db = new SmaRegDB();