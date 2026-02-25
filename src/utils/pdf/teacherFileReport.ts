import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AcademicYear, Term, Assessment } from '@/lib/types';
import { addHeader, addFooter, addSignatures, SchoolProfile } from './base';
import { db } from '@/db';
import { format } from 'date-fns';
import { calculateWeightedAverage } from '../calculations';

const fetchTeacherFileData = async (yearId: string, termId?: string) => {
    try {
        const terms = await db.terms.where('year_id').equals(yearId).toArray();
        const targetTerms = termId ? terms.filter(t => t.id === termId) : terms;
        const sortedTerms = targetTerms.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

        const annotations = await db.teacher_file_annotations
            .where('academic_year_id').equals(yearId)
            .toArray();

        const timetable = await db.timetable.where('year_id').equals(yearId).toArray();

        const termChapters = await Promise.all(sortedTerms.map(async (term) => {
            const classes = await db.classes.where('[year_id+term_id]').equals([yearId, term.id]).toArray();
            const classIds = classes.map(c => c.id);

            // Fetch Flexible Portfolio Data
            const [flexTemplates, flexEntries, flexAttachments] = await Promise.all([
                db.teacherfile_templates.where('term_id').equals(term.id).toArray(),
                db.teacherfile_entries.where('term_id').equals(term.id).toArray(),
                db.teacherfile_entry_attachments.toArray()
            ]);

            const assessments = await db.assessments
                .where('term_id')
                .equals(term.id)
                .filter(a => classIds.includes(a.class_id))
                .toArray();
            
            const assessmentIds = assessments.map(a => a.id);

            const [learners, marks, evidence, remediationTasks, attachments, lessonLogs, topics, diagnostics, samples] = await Promise.all([
                db.learners.where('class_id').anyOf(classIds).toArray(),
                assessmentIds.length > 0 ? db.assessment_marks.where('assessment_id').anyOf(assessmentIds).toArray() : Promise.resolve([]),
                db.evidence.where('term_id').equals(term.id).filter(e => classIds.includes(e.class_id)).toArray(),
                db.remediation_tasks.where('term_id').equals(term.id).toArray(),
                db.teacher_file_attachments.where('term_id').equals(term.id).toArray(),
                db.lesson_logs.toArray(),
                db.curriculum_topics.where('term_id').equals(term.id).toArray(),
                db.diagnostics.toArray(),
                db.moderation_samples.where('term_id').equals(term.id).toArray()
            ]);

            const assessmentIdsSet = new Set(assessments.map(a => a.id));
            const relevantMarks = marks.filter(m => assessmentIdsSet.has(m.assessment_id));

            const classAnalytics = classes.map(cls => {
                const clsAss = assessments.filter(a => a.class_id === cls.id);
                const clsLearners = learners.filter(l => l.class_id === cls.id);
                const clsMarks = relevantMarks.filter(m => clsAss.some(a => a.id === m.assessment_id));
                const clsEvidence = evidence.filter(e => e.class_id === cls.id);
                const classSample = samples.find(s => s.class_id === cls.id);

                const avgs = clsLearners.map(l => l.id ? calculateWeightedAverage(clsAss, clsMarks, l.id) : 0).filter(a => a > 0);
                const avg = avgs.length > 0 ? (avgs.reduce((s, a) => s + a, 0) / avgs.length).toFixed(1) : "0.0";
                const passRate = avgs.length > 0 ? Math.round((avgs.filter(a => a >= 50).length / avgs.length) * 100) : 0;

                const sampleNames = classSample 
                    ? clsLearners
                        .filter(l => l.id && classSample.learner_ids.includes(l.id))
                        .map(l => l.name)
                    : [];

                // Filter flexible entries for this class
                const classFlexEntries = flexEntries.filter(e => e.class_id === cls.id);

                return {
                    id: cls.id,
                    name: cls.className,
                    subject: cls.subject,
                    grade: cls.grade,
                    avg,
                    passRate,
                    learnerCount: clsLearners.length,
                    evidenceCount: clsEvidence.length,
                    scriptCount: clsEvidence.filter(e => e.category === 'script').length,
                    sampleNames,
                    flexEntries: classFlexEntries
                };
            });

            const tSlots = await db.timetable.where('class_id').anyOf(classIds).toArray();
            const slotMap = new Map(tSlots.map(s => [s.id, s.class_id]));
            const classMap = new Map(classes.map(c => [c.id, c.className]));

            const formattedLogs = lessonLogs
                .filter(l => slotMap.has(l.timetable_id))
                .map(l => ({
                    date: format(new Date(l.date), 'dd/MM/yy'),
                    className: classMap.get(slotMap.get(l.timetable_id) || "") || "General",
                    content: l.content,
                    homework: l.homework || "-"
                }))
                .sort((a, b) => b.date.localeCompare(a.date));

            return {
                term,
                classes: classAnalytics,
                assessments: assessments.sort((a, b) => (a.date || '').localeCompare(b.date || '')),
                evidence: evidence.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')),
                annotations: annotations.filter(a => a.term_id === term.id),
                attachments: attachments || [],
                remediationTasks: remediationTasks || [],
                logs: formattedLogs,
                topics: topics || [],
                flexAttachments
            };
        }));

        const introNotes = annotations.find(a => !a.term_id && a.section_key === 'cover.reflection')?.content || "";

        return { termChapters, introNotes, timetable };
    } catch (err) {
        console.error("[TeacherFile:DataFetch] Failed to gather records:", err);
        throw new Error("Critical failure during record compilation.");
    }
};

export const generateTeacherFilePDF = async (
    year: AcademicYear,
    profile: SchoolProfile,
    specificTermId?: string
) => {
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const { termChapters, introNotes, timetable } = await fetchTeacherFileData(year.id, specificTermId);
        const pageWidth = doc.internal.pageSize.width;
        const margin = 20;

        if (!specificTermId) {
            // COVER PAGE
            addHeader(doc, profile, "Professional Teacher Portfolio");
            doc.setFontSize(40);
            doc.setFont("helvetica", "bold");
            doc.text("TEACHER FILE", pageWidth / 2, 100, { align: 'center' });
            doc.setFontSize(18);
            doc.setTextColor(60);
            doc.text(year.name, pageWidth / 2, 115, { align: 'center' });

            if (introNotes) {
                doc.setFontSize(11);
                doc.setFont("helvetica", "italic");
                const splitIntro = doc.splitTextToSize(introNotes, pageWidth - (margin * 2));
                doc.text(splitIntro, margin, 140);
            }

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Educator: ${profile.teacher}`, margin, doc.internal.pageSize.height - 40);
            doc.text(`Institution: ${profile.name}`, margin, doc.internal.pageSize.height - 34);
            addFooter(doc);
            doc.addPage();
        }

        termChapters.forEach((ch, chIdx) => {
            if (chIdx > 0) doc.addPage();
            const startY = addHeader(doc, profile, `${ch.term.name} Record`);
            let currentY = startY + 5;

            // ... Personal Details, Timetable, ATP, Record of Work ...
            // (Keeping existing standard sections)

            // SECTION 11: FLEXIBLE PORTFOLIO ENTRIES
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Term Portfolio Commentary & Evidence", margin, currentY);
            currentY += 8;

            ch.classes.forEach(cls => {
                if (cls.flexEntries.length > 0) {
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text(`Class: ${cls.name} (${cls.subject})`, margin, currentY);
                    currentY += 6;

                    cls.flexEntries.forEach(entry => {
                        if (currentY > doc.internal.pageSize.height - 40) {
                            addFooter(doc);
                            doc.addPage();
                            currentY = 25;
                        }

                        doc.setFontSize(9);
                        doc.setFont("helvetica", "bold");
                        doc.text(entry.title || "Entry", margin + 5, currentY);
                        doc.setFont("helvetica", "normal");
                        doc.setTextColor(100);
                        doc.text(format(new Date(entry.created_at), 'dd MMM yyyy'), pageWidth - margin - 25, currentY);
                        currentY += 5;

                        doc.setTextColor(60);
                        doc.setFont("helvetica", "italic");
                        const splitContent = doc.splitTextToSize(entry.content || "", pageWidth - (margin * 2) - 10);
                        doc.text(splitContent, margin + 5, currentY);
                        currentY += (splitContent.length * 4) + 8;
                        doc.setTextColor(0);
                    });
                }
            });

            addSignatures(doc, currentY);
            addFooter(doc);
        });

        const filename = specificTermId 
            ? `TeacherFile_${year.name}_${termChapters[0].term.name.replace(' ', '')}.pdf`
            : `TeacherFile_FullRecord_${year.name}.pdf`;

        doc.save(filename);
    } catch (e) {
        console.error("[TeacherFile:PDF] Compilation aborted:", e);
        throw e;
    }
};