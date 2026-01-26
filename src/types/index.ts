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