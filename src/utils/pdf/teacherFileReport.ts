import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AcademicYear, Term } from '@/lib/types';
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

            const [learners, assessments, marks, evidence, remediationTasks, attachments] = await Promise.all([
                db.learners.where('class_id').anyOf(classIds).toArray(),
                db.assessments.where('term_id').equals(term.id).filter(a => classIds.includes(a.class_id)).toArray(),
                db.assessment_marks.toArray(), 
                db.evidence.where('term_id').equals(term.id).filter(e => classIds.includes(e.class_id)).toArray(),
                db.remediation_tasks.where('term_id').equals(term.id).toArray(),
                db.teacher_file_attachments.where('term_id').equals(term.id).toArray()
            ]);

            const assessmentIds = new Set(assessments.map(a => a.id));
            const relevantMarks = marks.filter(m => assessmentIds.has(m.assessment_id));

            const classAnalytics = classes.map(cls => {
                const clsAss = assessments.filter(a => a.class_id === cls.id);
                const clsLearners = learners.filter(l => l.class_id === cls.id);
                const clsMarks = relevantMarks.filter(m => clsAss.some(a => a.id === m.assessment_id));

                const avgs = clsLearners.map(l => l.id ? calculateWeightedAverage(clsAss, clsMarks, l.id) : 0).filter(a => a > 0);
                const avg = avgs.length > 0 ? (avgs.reduce((s, a) => s + a, 0) / avgs.length).toFixed(1) : "0.0";
                const passRate = avgs.length > 0 ? Math.round((avgs.filter(a => a >= 50).length / avgs.length) * 100) : 0;

                return {
                    name: cls.className,
                    subject: cls.subject,
                    grade: cls.grade,
                    avg,
                    passRate,
                    learnerCount: clsLearners.length,
                    evidenceCount: evidence.filter(e => e.class_id === cls.id).length
                };
            });

            return {
                term,
                classes: classAnalytics,
                assessments: assessments.sort((a, b) => (a.date || '').localeCompare(b.date || '')),
                evidence: evidence.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')),
                annotations: annotations.filter(a => a.term_id === term.id),
                attachments: attachments || [],
                remediationTasks: remediationTasks || []
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

            // INDEX PAGE
            addHeader(doc, profile, "Table of Contents");
            let indexY = 60;
            const standardSections = [
                "1. Personal details", "2. Timetable", "3. Subject Policy and Support Documents",
                "4. Planning", "5. Assessment", "6. Educator Reports",
                "7. Textbook / LTSMs control records", "8. Subject Meeting Minutes",
                "9. IQMS", "10. Correspondence"
            ];

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Consolidated Academic Index", margin, indexY);
            indexY += 10;

            standardSections.forEach((s) => {
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(s, margin + 5, indexY);
                indexY += 8;
            });

            addFooter(doc);
            doc.addPage();
        }

        termChapters.forEach((ch, chIdx) => {
            if (chIdx > 0) doc.addPage();
            const startY = addHeader(doc, profile, `${ch.term.name} Record`);
            let currentY = startY + 5;

            // SECTION 2: TIMETABLE
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("2. Timetable / Daily Routine", margin, currentY);
            
            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            const maxPeriod = timetable.length > 0 ? Math.max(...timetable.map(t => t.period)) : 6;
            const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

            const tableData = periods.map(p => {
                const row = [p.toString()];
                days.forEach(d => {
                    const entry = timetable.find(t => t.day === d && t.period === p);
                    row.push(entry ? `${entry.class_name}\n(${entry.subject})` : "-");
                });
                return row;
            });

            autoTable(doc, {
                startY: currentY + 3,
                head: [['Per', ...days]],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
                headStyles: { fillColor: [100, 116, 139] },
                columnStyles: { 0: { cellWidth: 10 } }
            });

            currentY = (doc as any).lastAutoTable.finalY + 15;

            // SECTION 5.5: MARK SCHEDULES
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("5.5 Mark Schedules Summary", margin, currentY);
            
            autoTable(doc, {
                startY: currentY + 3,
                head: [['Class', 'Subject', 'Learners', 'Avg %', 'Pass %']],
                body: ch.classes.map(c => [c.name, c.subject, c.learnerCount, `${c.avg}%`, `${c.passRate}%`]),
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 37, 36] }
            });

            currentY = (doc as any).lastAutoTable.finalY + 15;

            // SECTION 5.6: REMEDIATION PLAN
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("5.6 Subject Improvement & Remediation Plan", margin, currentY);
            
            if (ch.remediationTasks.length > 0) {
                autoTable(doc, {
                    startY: currentY + 3,
                    head: [['Intervention Strategy', 'Source Task', 'Status']],
                    body: ch.remediationTasks.map((t: any) => [
                        t.description, 
                        t.title, 
                        t.status.toUpperCase()
                    ]),
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [37, 99, 235] }
                });
                currentY = (doc as any).lastAutoTable.finalY + 15;
            } else {
                doc.setFontSize(9);
                doc.setFont("helvetica", "italic");
                doc.text("No formal interventions logged for this term.", margin, currentY + 8);
                currentY += 15;
            }

            // ATTACHMENT REGISTRY
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Portfolio Attachment Registry", margin, currentY);
            currentY += 8;

            const sectionKeys = [
                'subject_policy', 'atp', 'lesson_plans', 'file_control', 'poa', 'fats', 
                'memoranda', 'moderation', 'record_sheets', 'improvement_plan',
                'educator_reports', 'textbook_records', 'meeting_minutes', 'iqms', 'correspondence'
            ];

            sectionKeys.forEach(key => {
                const sectionAttachments = ch.attachments.filter(a => a.section_key === key);
                if (sectionAttachments.length > 0) {
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "bold");
                    doc.text(`${key.replace('_', ' ').toUpperCase()}:`, margin, currentY);
                    currentY += 5;
                    
                    sectionAttachments.forEach(att => {
                        doc.setFontSize(8);
                        doc.setFont("helvetica", "normal");
                        doc.text(`- ${att.file_name} (Uploaded: ${format(new Date(att.created_at), 'dd/MM/yy')})`, margin + 5, currentY);
                        currentY += 5;
                        
                        if (currentY > doc.internal.pageSize.height - 40) {
                            addFooter(doc);
                            doc.addPage();
                            currentY = 20;
                        }
                    });
                    currentY += 5;
                }
            });

            // COMMENTARY COMPILATION
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Professional Commentary & Reflections", margin, currentY);
            currentY += 8;

            if (ch.annotations.length === 0) {
                doc.setFontSize(9);
                doc.setFont("helvetica", "italic");
                doc.text("No professional commentary recorded for this term period.", margin, currentY);
                currentY += 10;
            } else {
                ch.annotations.forEach(a => {
                    const label = a.section_key.split('.')[0].replace('_', ' ').toUpperCase();
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "bold");
                    doc.text(`${label}:`, margin, currentY);
                    
                    doc.setFont("helvetica", "italic");
                    const splitComm = doc.splitTextToSize(a.content, pageWidth - (margin * 2));
                    doc.text(splitComm, margin, currentY + 6);
                    currentY += 12 + (splitComm.length * 5);

                    if (currentY > doc.internal.pageSize.height - 40) {
                        addFooter(doc);
                        doc.addPage();
                        currentY = 20;
                    }
                });
            }

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