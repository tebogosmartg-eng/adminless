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

        const termChapters = await Promise.all(sortedTerms.map(async (term) => {
            const classes = await db.classes.where('[year_id+term_id]').equals([yearId, term.id]).toArray();
            const classIds = classes.map(c => c.id);

            const [learners, assessments, marks, evidence, remediationTasks] = await Promise.all([
                db.learners.where('class_id').anyOf(classIds).toArray(),
                db.assessments.where('term_id').equals(term.id).filter(a => classIds.includes(a.class_id)).toArray(),
                db.assessment_marks.toArray(), 
                db.evidence.where('term_id').equals(term.id).filter(e => classIds.includes(e.class_id)).toArray(),
                db.remediation_tasks.where('term_id').equals(term.id).toArray()
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

            // Gather all annotations for this term
            const termAnnotations = annotations.filter(a => a.term_id === term.id);

            return {
                term,
                classes: classAnalytics,
                assessments: assessments.sort((a, b) => (a.date || '').localeCompare(b.date || '')),
                evidence: evidence.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')),
                annotations: termAnnotations,
                totalRemediation: remediationTasks.length
            };
        }));

        const introNotes = annotations.find(a => !a.term_id && a.section_key === 'cover.reflection')?.content || "";

        return { termChapters, introNotes };
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
        const { termChapters, introNotes } = await fetchTeacherFileData(year.id, specificTermId);
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
                "1. Personal details",
                "2. Timetable",
                "3. Subject Policy and Support Documents",
                "4. Planning",
                "5. Assessment",
                "6. Educator Reports",
                "7. Textbook / LTSMs control records",
                "8. Subject Meeting Minutes",
                "9. IQMS",
                "10. Correspondence"
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

            indexY += 10;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Term Chapters", margin, indexY);
            indexY += 10;

            termChapters.forEach((ch, idx) => {
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(ch.term.name, margin + 5, indexY);
                doc.text(`Chapter ${idx + 1}`, pageWidth - margin - 20, indexY, { align: 'right' });
                indexY += 8;
            });

            addFooter(doc);
            doc.addPage();
        }

        termChapters.forEach((ch, chIdx) => {
            if (chIdx > 0) doc.addPage();
            const startY = addHeader(doc, profile, `${ch.term.name} Record`);
            let currentY = startY + 5;

            // SECTION 5.5 RECORD SHEETS
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

            currentY = (doc as any).lastAutoTable.finalY + 10;

            // SECTION 5.1 POA
            doc.text("5.1 Programme of Assessment", margin, currentY);
            autoTable(doc, {
                startY: currentY + 3,
                head: [['Task Title', 'Type', 'Max Mark', 'Weight']],
                body: ch.assessments.map(a => [a.title, a.type, a.max_mark, `${a.weight}%`]),
                theme: 'striped',
                styles: { fontSize: 8 }
            });

            currentY = (doc as any).lastAutoTable.finalY + 10;

            // COMMENTARY COMPILATION
            doc.text("Administrative Commentary & Reflections", margin, currentY);
            if (ch.annotations.length === 0) {
                doc.setFontSize(9);
                doc.setFont("helvetica", "italic");
                doc.text("No professional commentary recorded for this term period.", margin, currentY + 8);
                currentY += 15;
            } else {
                ch.annotations.forEach(a => {
                    const label = a.section_key.split('.')[0].replace('_', ' ').toUpperCase();
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "bold");
                    doc.text(`${label}:`, margin, currentY + 8);
                    
                    doc.setFont("helvetica", "italic");
                    const splitComm = doc.splitTextToSize(a.content, pageWidth - (margin * 2));
                    doc.text(splitComm, margin, currentY + 14);
                    currentY += 16 + (splitComm.length * 5);
                });
            }

            if (currentY > doc.internal.pageSize.height - 40) {
                doc.addPage();
                currentY = 40;
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