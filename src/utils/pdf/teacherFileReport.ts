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

            // Fetch assessments first to get IDs for mark filtering
            const assessments = await db.assessments
                .where('term_id')
                .equals(term.id)
                .filter(a => classIds.includes(a.class_id))
                .toArray();
            
            const assessmentIds = assessments.map(a => a.id);

            const [learners, marks, evidence, remediationTasks, attachments, lessonLogs, topics, diagnostics] = await Promise.all([
                db.learners.where('class_id').anyOf(classIds).toArray(),
                assessmentIds.length > 0 ? db.assessment_marks.where('assessment_id').anyOf(assessmentIds).toArray() : Promise.resolve([]),
                db.evidence.where('term_id').equals(term.id).filter(e => classIds.includes(e.class_id)).toArray(),
                db.remediation_tasks.where('term_id').equals(term.id).toArray(),
                db.teacher_file_attachments.where('term_id').equals(term.id).toArray(),
                db.lesson_logs.toArray(),
                db.curriculum_topics.where('term_id').equals(term.id).toArray(),
                db.diagnostics.toArray()
            ]);

            const assessmentIdsSet = new Set(assessments.map(a => a.id));
            const relevantMarks = marks.filter(m => assessmentIdsSet.has(m.assessment_id));

            const classAnalytics = classes.map(cls => {
                const clsAss = assessments.filter(a => a.class_id === cls.id);
                const clsLearners = learners.filter(l => l.class_id === cls.id);
                const clsMarks = relevantMarks.filter(m => clsAss.some(a => a.id === m.assessment_id));
                const clsEvidence = evidence.filter(e => e.class_id === cls.id);

                const avgs = clsLearners.map(l => l.id ? calculateWeightedAverage(clsAss, clsMarks, l.id) : 0).filter(a => a > 0);
                const avg = avgs.length > 0 ? (avgs.reduce((s, a) => s + a, 0) / avgs.length).toFixed(1) : "0.0";
                const passRate = avgs.length > 0 ? Math.round((avgs.filter(a => a >= 50).length / avgs.length) * 100) : 0;

                return {
                    id: cls.id,
                    name: cls.className,
                    subject: cls.subject,
                    grade: cls.grade,
                    avg,
                    passRate,
                    learnerCount: clsLearners.length,
                    evidenceCount: clsEvidence.length,
                    scriptCount: clsEvidence.filter(e => e.category === 'script').length
                };
            });

            // Format lesson logs for Section 4.3
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

            const diagnosticSummaries = assessments
                .map(ass => {
                    const diag = diagnostics.find(d => d.assessment_id === ass.id);
                    if (!diag) return null;
                    let findings = "Analysis finalized.";
                    try {
                        const parsed = JSON.parse(diag.findings);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            findings = parsed[0].performance_summary || findings;
                        }
                    } catch(e) {}
                    return { title: ass.title, findings };
                })
                .filter(Boolean);

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
                diagnosticSummaries
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

            // SECTION 1: PERSONAL DETAILS
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("1. Personal Details", margin, currentY);
            currentY += 4;
            autoTable(doc, {
                startY: currentY,
                body: [
                    ["Educator Name:", profile.teacher || "N/A"],
                    ["Institution:", profile.name || "N/A"],
                    ["SACE Number:", profile.saceNumber || "N/A"],
                    ["EMIS/School Code:", profile.schoolCode || "N/A"]
                ],
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 1 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
            });
            currentY = (doc as any).lastAutoTable.finalY + 10;

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

            currentY = (doc as any).lastAutoTable.finalY + 12;

            // SECTION 4.1: ATP
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("4.1 Annual Teaching Plan (ATP)", margin, currentY);
            if (ch.topics && ch.topics.length > 0) {
                autoTable(doc, {
                    startY: currentY + 3,
                    head: [['#', 'Topic / Content Area', 'Grade', 'Subject']],
                    body: ch.topics.map((t: any, i: number) => [i + 1, t.title, t.grade, t.subject]),
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [71, 85, 105] },
                    columnStyles: { 0: { cellWidth: 10 } }
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
            } else {
                doc.setFontSize(9);
                doc.setFont("helvetica", "italic");
                doc.text("No curriculum topics defined for this term.", margin, currentY + 8);
                currentY += 15;
            }

            // SECTION 4.3: RECORD OF WORK (Increased limit to 100)
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("4.3 Record of Work (Automated Audit)", margin, currentY);
            
            if (ch.logs.length > 0) {
                autoTable(doc, {
                    startY: currentY + 3,
                    head: [['Date', 'Class', 'Work Covered / Topic', 'Homework']],
                    body: ch.logs.slice(0, 100).map((l: any) => [l.date, l.className, l.content, l.homework]),
                    theme: 'striped',
                    styles: { fontSize: 7, cellPadding: 2 },
                    headStyles: { fillColor: [71, 85, 105] },
                    columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 15 }, 3: { cellWidth: 30 } }
                });
                currentY = (doc as any).lastAutoTable.finalY + 12;
            } else {
                doc.setFontSize(9);
                doc.setFont("helvetica", "italic");
                doc.text("No lesson logs found for this term.", margin, currentY + 8);
                currentY += 15;
            }

            if (currentY > doc.internal.pageSize.height - 60) {
                addFooter(doc);
                doc.addPage();
                currentY = 20;
            }

            // SECTION 5.1 & 5.2: POA & Mapping
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("5.1 & 5.2 Programme of Assessment & Task Mapping", margin, currentY);
            autoTable(doc, {
                startY: currentY + 3,
                head: [['Task Title', 'Type', 'Weight', 'Portfolio Mapping']],
                body: ch.assessments.map((ass: any) => [
                    ass.title, 
                    ass.type, 
                    `${ass.weight}%`, 
                    ass.task_slot_key ? ass.task_slot_key.replace('_', ' ').toUpperCase() : "UNMAPPED"
                ]),
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 37, 36] }
            });
            currentY = (doc as any).lastAutoTable.finalY + 10;

            // SECTION 5.4: MODERATION AUDIT
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("5.4 Moderation Audit Status", margin, currentY);
            autoTable(doc, {
                startY: currentY + 3,
                head: [['Class Name', 'Learner Count', 'Sample Scripts Attached']],
                body: ch.classes.map((cls: any) => [cls.name, cls.learnerCount, cls.scriptCount]),
                theme: 'grid',
                styles: { fontSize: 8, halign: 'center' },
                columnStyles: { 0: { halign: 'left' } },
                headStyles: { fillColor: [22, 163, 74] }
            });
            currentY = (doc as any).lastAutoTable.finalY + 10;

            // SECTION 5.5: PERFORMANCE MATRIX
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("5.5 Mark Schedules & Performance Matrix", margin, currentY);
            autoTable(doc, {
                startY: currentY + 3,
                head: [['Class', 'Subject', 'Learners', 'Avg %', 'Pass %']],
                body: ch.classes.map(c => [c.name, c.subject, c.learnerCount, `${c.avg}%`, `${c.passRate}%`]),
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 37, 36] }
            });
            currentY = (doc as any).lastAutoTable.finalY + 12;

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
                currentY = (doc as any).lastAutoTable.finalY + 12;
            } else {
                doc.setFontSize(9);
                doc.setFont("helvetica", "italic");
                doc.text("No formal interventions logged for this term.", margin, currentY + 8);
                currentY += 15;
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