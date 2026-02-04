"use client";

import { db } from '@/db';
import { supabase } from '@/integrations/supabase/client';
import { queueAction } from './sync';

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

  // 2. Create Terms
  const terms = [
    { id: crypto.randomUUID(), name: "Term 1", weight: 25, closed: true },
    { id: crypto.randomUUID(), name: "Term 2", weight: 25, closed: true },
    { id: crypto.randomUUID(), name: "Term 3", weight: 25, closed: false },
    { id: crypto.randomUUID(), name: "Term 4", weight: 25, closed: true }
  ].map(t => ({
    ...t,
    year_id: yearId,
    user_id: user.id,
    start_date: null,
    end_date: null
  }));

  const activeTermId = terms[2].id; // Term 3 is the active one

  // 3. Create Classes
  const classes = [
    { id: crypto.randomUUID(), subject: "Mathematics", grade: "Grade 10", className: "10A" },
    { id: crypto.randomUUID(), subject: "Physical Sciences", grade: "Grade 11", className: "11C" },
    { id: crypto.randomUUID(), subject: "Life Sciences", grade: "Grade 10", className: "10B" }
  ].map(c => ({
    ...c,
    user_id: user.id,
    year_id: yearId,
    term_id: activeTermId,
    archived: false,
    notes: "Demo class created for testing.",
    created_at: new Date().toISOString()
  }));

  // 4. Create Learners
  const studentNames = [
    "Thabo Mbeki", "Sarah Jenkins", "Liam Neeson", "Emma Watson", "John Snow", 
    "Arya Stark", "Peter Parker", "Bruce Wayne", "Diana Prince", "Tony Stark",
    "Steve Rogers", "Natasha Romanoff", "Wanda Maximoff", "Vision", "Sam Wilson"
  ];

  const allLearners: any[] = [];
  classes.forEach(cls => {
    // Pick 8-12 random students for each class
    const count = 8 + Math.floor(Math.random() * 5);
    const shuffled = [...studentNames].sort(() => 0.5 - Math.random());
    shuffled.slice(0, count).forEach(name => {
      allLearners.push({
        id: crypto.randomUUID(),
        class_id: cls.id,
        user_id: user.id,
        name,
        mark: "" // Will be updated by calculation service
      });
    });
  });

  // 5. Create Assessments for the active term
  const assessments: any[] = [];
  classes.forEach(cls => {
    assessments.push(
      { id: crypto.randomUUID(), title: "Class Test 1", type: "Test", max_mark: 50, weight: 20 },
      { id: crypto.randomUUID(), title: "Mid-Term Project", type: "Project", max_mark: 100, weight: 30 },
      { id: crypto.randomUUID(), title: "Practical Exam", type: "Exam", max_mark: 60, weight: 50 }
    );
    
    // Assign common props
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
      // Generate realistic scores (avg 65%)
      const baseScore = 0.4 + (Math.random() * 0.55); // 40% to 95%
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

  // 7. Transactional Write to Local DB
  await db.transaction('rw', [
    db.academic_years, db.terms, db.classes, db.learners, 
    db.assessments, db.assessment_marks, db.sync_queue
  ], async () => {
    await db.academic_years.add(year);
    await db.terms.bulkAdd(terms);
    await db.classes.bulkAdd(classes);
    await db.learners.bulkAdd(allLearners);
    await db.assessments.bulkAdd(assessments);
    await db.assessment_marks.bulkAdd(marks);

    // Queue for sync
    await queueAction('academic_years', 'create', year);
    await queueAction('terms', 'create', terms);
    await queueAction('classes', 'create', classes);
    await queueAction('learners', 'create', allLearners);
    await queueAction('assessments', 'create', assessments);
    await queueAction('assessment_marks', 'create', marks);
  });

  return { yearId, activeTermId };
};