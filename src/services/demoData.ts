"use client";

import { db } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from './sync';
import { format, startOfMonth, addDays, subDays } from 'date-fns';
import { LearnerNote } from '@/lib/types';

export const importDemoData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required for demo import.");

  // 1. Create Academic Year
  const yearId = crypto.randomUUID();
  const year = {
    id: yearId,
    user_id: user.id,
    name: "2024 (Demo)",
    closed: false
  };

  // 2. Create Terms with realistic dates for the timeline widget
  const today = new Date();
  const term3Start = subDays(today, 30);
  const term3End = addDays(today, 60);

  const terms = [
    { id: crypto.randomUUID(), name: "Term 1", weight: 25, closed: true, is_finalised: true, start_date: null, end_date: null },
    { id: crypto.randomUUID(), name: "Term 2", weight: 25, closed: true, is_finalised: true, start_date: null, end_date: null },
    { id: crypto.randomUUID(), name: "Term 3", weight: 25, closed: false, is_finalised: false, start_date: term3Start.toISOString(), end_date: term3End.toISOString() },
    { id: crypto.randomUUID(), name: "Term 4", weight: 25, closed: true, is_finalised: false, start_date: null, end_date: null }
  ].map(t => ({
    ...t,
    year_id: yearId,
    user_id: user.id
  }));

  const activeTermId = terms[2].id; // Term 3 is the active one

  // 3. Create Classes - strict DB schema to prevent 400 errors
  const classes = [
    { id: crypto.randomUUID(), subject: "Mathematics", grade: "Grade 10", class_name: "10A" },
    { id: crypto.randomUUID(), subject: "Physical Sciences", grade: "Grade 11", class_name: "11C" },
    { id: crypto.randomUUID(), subject: "Life Sciences", grade: "Grade 10", class_name: "10B" }
  ].map(c => ({
    ...c,
    user_id: user.id,
    archived: false,
    notes: "Demo class created for testing.",
    created_at: new Date().toISOString()
  }));

  // 4. Create Learners
  const learnerNames = [
    "Rorisang Setshedi", // Featured Learner
    "Thabo Mbeki", "Sarah Jenkins", "Liam Neeson", "Emma Watson", "John Snow", 
    "Arya Stark", "Peter Parker", "Bruce Wayne", "Diana Prince", "Tony Stark",
    "Steve Rogers", "Natasha Romanoff", "Wanda Maximoff", "Vision", "Sam Wilson"
  ];

  const allLearners: any[] = [];
  classes.forEach(cls => {
    const isMath = cls.subject === "Mathematics";
    const count = 10 + Math.floor(Math.random() * 5);
    const shuffled = [...learnerNames].sort(() => 0.5 - Math.random());
    
    // Ensure Rorisang is in Mathematics
    const finalNames = isMath 
        ? ["Rorisang Setshedi", ...shuffled.filter(n => n !== "Rorisang Setshedi").slice(0, count - 1)]
        : shuffled.slice(0, count);

    finalNames.forEach(name => {
      allLearners.push({
        id: crypto.randomUUID(),
        class_id: cls.id,
        user_id: user.id,
        name
      });
    });
  });

  const rorisang = allLearners.find(l => l.name === "Rorisang Setshedi");

  // 5. Create Assessments
  const assessments: any[] = [];
  classes.forEach(cls => {
    assessments.push(
      { id: crypto.randomUUID(), title: "Class Test 1", type: "Test", max_mark: 50, weight: 20 },
      { id: crypto.randomUUID(), title: "Mid-Term Project", type: "Project", max_mark: 100, weight: 30 },
      { id: crypto.randomUUID(), title: "Practical Exam", type: "Exam", max_mark: 60, weight: 50 }
    );
    
    const last3 = assessments.slice(-3);
    last3.forEach(a => {
      a.class_id = cls.id;
      a.term_id = activeTermId;
      a.user_id = user.id;
      a.date = new Date().toISOString();
    });
  });

  // 6. Generate Marks
  const marks: any[] = [];
  assessments.forEach(ass => {
    const classLearners = allLearners.filter(l => l.class_id === ass.class_id);
    classLearners.forEach(l => {
      let baseScore = 0.45 + (Math.random() * 0.5); 
      
      // Give Rorisang consistently high marks
      if (l.name === "Rorisang Setshedi") {
          baseScore = 0.85 + (Math.random() * 0.1);
      }

      const score = Math.round(baseScore * ass.max_mark);
      
      marks.push({
        id: crypto.randomUUID(),
        assessment_id: ass.id,
        learner_id: l.id,
        user_id: user.id,
        score,
        comment: score < (ass.max_mark * 0.5) ? "Requires additional support." : "Good progress shown."
      });
    });
  });

  // 7. Add Timetable
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timetable: any[] = [];
  days.forEach(day => {
      const periods = [1, 2, 3, 4, 5, 6].sort(() => 0.5 - Math.random()).slice(0, 4);
      periods.forEach(p => {
          const cls = classes[Math.floor(Math.random() * classes.length)];
          timetable.push({
              id: crypto.randomUUID(),
              user_id: user.id,
              day,
              period: p,
              subject: cls.subject,
              class_name: cls.class_name,
              class_id: cls.id
          });
      });
  });

  // 8. Add Today's Attendance
  const attendance: any[] = [];
  const todayStr = format(today, 'yyyy-MM-dd');
  classes.forEach(cls => {
      allLearners.filter(l => l.class_id === cls.id).forEach(l => {
          attendance.push({
              id: crypto.randomUUID(),
              learner_id: l.id,
              class_id: cls.id,
              term_id: activeTermId,
              user_id: user.id,
              date: todayStr,
              status: l.name === "Rorisang Setshedi" ? 'present' : (Math.random() > 0.1 ? 'present' : 'absent')
          });
      });
  });

  // 9. Add some Todos
  const todos = [
    { title: "Review department moderation feedback", completed: false },
    { title: "Finalize Term 3 exam papers", completed: true },
    { title: "Parent meeting regarding math progress", completed: false }
  ].map(t => ({
      ...t,
      id: crypto.randomUUID(),
      user_id: user.id,
      year_id: yearId,
      term_id: activeTermId,
      created_at: new Date().toISOString()
  }));

  // 10. Add Learner Notes
  const learnerNotes: LearnerNote[] = [
      { id: crypto.randomUUID(), learner_id: rorisang?.id || allLearners[0].id, category: 'positive', content: 'Consistently demonstrating leadership in group activities. Excellent grasp of trigonometry.', date: todayStr, year_id: yearId, term_id: activeTermId, user_id: user.id, created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), learner_id: allLearners[5].id, category: 'academic', content: 'Excellent improvement in problem-solving techniques.', date: todayStr, year_id: yearId, term_id: activeTermId, user_id: user.id, created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), learner_id: allLearners[8].id, category: 'parent', content: 'Mother phoned to discuss extra lessons.', date: todayStr, year_id: yearId, term_id: activeTermId, user_id: user.id, created_at: new Date().toISOString() }
  ];

  // 11. Transactional Write to Local DB
  await db.transaction('rw', [
    db.academic_years, db.terms, db.classes, db.learners, 
    db.assessments, db.assessment_marks, db.timetable,
    db.attendance, db.todos, db.learner_notes
  ], async () => {
    await db.academic_years.put(year);
    await db.terms.bulkPut(terms);
    await db.classes.bulkPut(classes);
    await db.learners.bulkPut(allLearners);
    await db.assessments.bulkPut(assessments);
    await db.assessment_marks.bulkPut(marks);
    await db.timetable.bulkPut(timetable);
    await db.attendance.bulkPut(attendance);
    await db.todos.bulkPut(todos);
    await db.learner_notes.bulkPut(learnerNotes);
  });
  
  // 12. Remote Sync
  await queueAction('academic_years', 'upsert', year);
  await queueAction('terms', 'upsert', terms);
  await queueAction('classes', 'upsert', classes);
  await queueAction('learners', 'upsert', allLearners);
  await queueAction('assessments', 'upsert', assessments);
  await queueAction('assessment_marks', 'upsert', marks);
  await queueAction('timetable', 'upsert', timetable);
  await queueAction('attendance', 'upsert', attendance);
  await queueAction('todos', 'upsert', todos);
  await queueAction('learner_notes', 'upsert', learnerNotes);

  return { yearId, activeTermId };
};