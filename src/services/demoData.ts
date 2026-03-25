"use client";

import { supabase } from '@/integrations/supabase/client';
import { format, subDays, isWeekend } from 'date-fns';

export const importDemoData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required for demo import.");

  const userId = user.id;

  // 1. Create Academic Year
  const yearId = crypto.randomUUID();
  const year = {
    id: yearId,
    user_id: userId,
    name: "2024 (Demo)",
    closed: false
  };

  const { error: yearErr } = await supabase.from('academic_years').upsert(year);
  if (yearErr) throw new Error(`Academic Year Error: ${yearErr.message}`);

  // 2. Create Terms
  const today = new Date();
  const term3Start = subDays(today, 30);
  const term3End = subDays(today, -60); // 60 days in the future

  const terms = [
    { id: crypto.randomUUID(), year_id: yearId, user_id: userId, name: "Term 1", weight: 25, closed: true, is_finalised: true },
    { id: crypto.randomUUID(), year_id: yearId, user_id: userId, name: "Term 2", weight: 25, closed: true, is_finalised: true },
    { id: crypto.randomUUID(), year_id: yearId, user_id: userId, name: "Term 3", weight: 25, closed: false, is_finalised: false, start_date: term3Start.toISOString(), end_date: term3End.toISOString() },
    { id: crypto.randomUUID(), year_id: yearId, user_id: userId, name: "Term 4", weight: 25, closed: false, is_finalised: false }
  ];

  const { error: termsErr } = await supabase.from('terms').upsert(terms);
  if (termsErr) throw new Error(`Terms Error: ${termsErr.message}`);

  const activeTermId = terms[2].id;

  // 3. Create Classes
  const classes = [
    { id: crypto.randomUUID(), user_id: userId, grade: "Grade 10", subject: "Mathematics", class_name: "10A", archived: false, notes: "Demo Class" },
    { id: crypto.randomUUID(), user_id: userId, grade: "Grade 11", subject: "Physical Sciences", class_name: "11C", archived: false, notes: "Demo Class" },
    { id: crypto.randomUUID(), user_id: userId, grade: "Grade 10", subject: "English HL", class_name: "10B", archived: false, notes: "Demo Class" }
  ];

  const { error: classErr } = await supabase.from('classes').upsert(classes);
  if (classErr) throw new Error(`Classes Error: ${classErr.message}`);

  // 4. Create Learners (20 per class)
  const firstNames = ["James", "Sarah", "Thabo", "Lerato", "Michael", "Emma", "Sipho", "Zanele", "David", "Jessica", "Lungile", "Tshepo", "Anna", "Jason", "Khanya", "Willem", "Naledi", "Brian", "Chloe", "Dumisani", "Rachel", "Matthew", "Kagiso", "Leigh", "Bongani", "Megan", "Siyabonga", "Nadia", "Jabulani", "Tanya"];
  const lastNames = ["Smith", "Nkosi", "van der Merwe", "Dlamini", "Jones", "Ndlovu", "Botha", "Khumalo", "Williams", "Mokoena", "Brown", "Mthembu", "Taylor", "Ngcobo", "Davies", "Zuma", "Evans", "Mahlangu", "White", "Baloyi"];
  
  const learners: any[] = [];
  classes.forEach(cls => {
    const classNames = new Set<string>();
    while(classNames.size < 20) {
        const f = firstNames[Math.floor(Math.random() * firstNames.length)];
        const l = lastNames[Math.floor(Math.random() * lastNames.length)];
        classNames.add(`${f} ${l}`);
    }
    
    Array.from(classNames).forEach(name => {
        learners.push({
            id: crypto.randomUUID(),
            class_id: cls.id,
            name: name,
            mark: "",
            comment: ""
        });
    });
  });

  for (let i = 0; i < learners.length; i += 50) {
      const { error: learnerErr } = await supabase.from('learners').upsert(learners.slice(i, i + 50));
      if (learnerErr) throw new Error(`Learners Error: ${learnerErr.message}`);
  }

  // 5. Create Assessments (3 per class)
  const assessments: any[] = [];
  classes.forEach(cls => {
      assessments.push({
          id: crypto.randomUUID(),
          class_id: cls.id,
          term_id: activeTermId,
          user_id: userId,
          title: "Investigation 1",
          type: "Project",
          max_mark: 50,
          weight: 20,
          date: subDays(today, 15).toISOString()
      });
      assessments.push({
          id: crypto.randomUUID(),
          class_id: cls.id,
          term_id: activeTermId,
          user_id: userId,
          title: "Control Test",
          type: "Test",
          max_mark: 100,
          weight: 30,
          date: subDays(today, 5).toISOString()
      });
      assessments.push({
          id: crypto.randomUUID(),
          class_id: cls.id,
          term_id: activeTermId,
          user_id: userId,
          title: "Term Exam",
          type: "Exam",
          max_mark: 150,
          weight: 50,
          date: today.toISOString()
      });
  });

  const { error: assErr } = await supabase.from('assessments').upsert(assessments);
  if (assErr) throw new Error(`Assessments Error: ${assErr.message}`);

  // 6. Create Assessment Marks
  const marks: any[] = [];
  assessments.forEach(ass => {
      const classLearners = learners.filter(l => l.class_id === ass.class_id);
      classLearners.forEach(l => {
          let rawPct = (Math.random() + Math.random() + Math.random()) / 3;
          rawPct = rawPct * 0.8 + 0.2; 
          const score = Math.round(rawPct * ass.max_mark);
          
          marks.push({
              id: crypto.randomUUID(),
              assessment_id: ass.id,
              learner_id: l.id,
              user_id: userId,
              score: score,
              comment: score < (ass.max_mark * 0.4) ? "Requires intervention." : ""
          });
      });
  });
  
  for (let i = 0; i < marks.length; i += 50) {
      const { error: marksErr } = await supabase.from('assessment_marks').upsert(marks.slice(i, i + 50));
      if (marksErr) throw new Error(`Marks Error: ${marksErr.message}`);
  }

  // 7. Create Attendance (1 week / 5 weekdays)
  const attendance: any[] = [];
  let daysAdded = 0;
  let dayOffset = 0;
  
  while (daysAdded < 5) {
      const d = subDays(today, dayOffset);
      dayOffset++;
      if (isWeekend(d)) continue;
      
      const dateStr = format(d, 'yyyy-MM-dd');
      classes.forEach(cls => {
          const classLearners = learners.filter(l => l.class_id === cls.id);
          classLearners.forEach(l => {
              const rand = Math.random();
              let status = 'present';
              if (rand > 0.95) status = 'absent';
              else if (rand > 0.9) status = 'late';
              
              attendance.push({
                  id: crypto.randomUUID(),
                  learner_id: l.id,
                  class_id: cls.id,
                  term_id: activeTermId,
                  user_id: userId,
                  date: dateStr,
                  status: status
              });
          });
      });
      daysAdded++;
  }

  for (let i = 0; i < attendance.length; i += 50) {
      const { error: attErr } = await supabase.from('attendance').upsert(attendance.slice(i, i + 50));
      if (attErr) throw new Error(`Attendance Error: ${attErr.message}`);
  }

  // 8. Create Timetable
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timetable: any[] = [];
  
  classes.forEach((cls, index) => {
      daysOfWeek.forEach(day => {
          timetable.push({
              user_id: userId,
              day: day,
              period: index + 1, // Distribute classes sequentially
              subject: cls.subject,
              class_name: cls.class_name,
              class_id: cls.id,
              start_time: `0${8 + index}:00`,
              end_time: `0${8 + index}:55`
          });
      });
  });

  for (let i = 0; i < timetable.length; i += 50) {
      const { error: ttErr } = await supabase.from('timetable').upsert(timetable.slice(i, i + 50), { onConflict: 'day,period,class_id' });
      if (ttErr) throw new Error(`Timetable Error: ${ttErr.message}`);
  }

  // 9. Create Tasks / Todos
  const todos = [
      { id: crypto.randomUUID(), user_id: userId, year_id: yearId, term_id: activeTermId, title: "Review Term 3 Mathematics assessments", completed: false },
      { id: crypto.randomUUID(), user_id: userId, year_id: yearId, term_id: activeTermId, title: "Prepare moderation sample for HOD", completed: false },
      { id: crypto.randomUUID(), user_id: userId, year_id: yearId, term_id: activeTermId, title: "Print attendance registers", completed: true }
  ];

  const { error: todoErr } = await supabase.from('todos').upsert(todos);
  if (todoErr) throw new Error(`Todos Error: ${todoErr.message}`);

  // 10. Create Curriculum Topics
  const topics: any[] = [];
  classes.forEach(cls => {
      topics.push({ id: crypto.randomUUID(), user_id: userId, term_id: activeTermId, subject: cls.subject, grade: cls.grade, title: "Term 3 Introduction", order: 1 });
      topics.push({ id: crypto.randomUUID(), user_id: userId, term_id: activeTermId, subject: cls.subject, grade: cls.grade, title: "Core Fundamentals", order: 2 });
      topics.push({ id: crypto.randomUUID(), user_id: userId, term_id: activeTermId, subject: cls.subject, grade: cls.grade, title: "Advanced Applications", order: 3 });
  });

  const { error: topicsErr } = await supabase.from('curriculum_topics').upsert(topics);
  if (topicsErr) throw new Error(`Topics Error: ${topicsErr.message}`);

  return { yearId, activeTermId };
};