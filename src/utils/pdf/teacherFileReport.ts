import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AcademicYear, Term, ClassInfo, Assessment, Evidence } from '@/lib/types';
import { addHeader, addFooter, addSignatures, SchoolProfile } from './base';
import { db } from '@/db';
import { format } from 'date-fns';
import { calculateWeightedAverage } from '../calculations';

/**
 * Fetches all necessary data for a Teacher File export without using hooks.
 */
const fetchTeacherFileData = async (yearId: string, termId?: string) => {
    // 1. Resolve Scope
    const terms = await db.terms
        .where('year_id').equals(yearId)
        .toArray();
    
    const targetTerms = termId ? terms.filter(t => t.id === termId) : terms;
    const sortedTerms = targetTerms.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    // 2. Resolve Annotations
    const annotations = await db.teacher_file_annotations
        .where('academic_year_id').equals(yearId)
        .toArray();

    // 3. Prepare Term Records
    const termChapters = await Promise.all(sortedTerms.map(async (term) => {
        const classes = await db.classes.where('[year_id+term_id]').equals([yearId, term.id]).toArray();
        const classIds = classes.map(c => c.id);

        const [learners, assessments, marks, evidence] = await Promise.all([
            db.learners.where('class_id').anyOf(classIds).toArray(),
            db.assessments.where('term_id').equals(term.id).filter(a => classIds.includes(a.class_id)).toArray(),
            db.assessment_marks.toArray(), // Filtered later due to Dexie limits on large IN sets
            db.evidence.where('term_id').equals(term.id).filter(e => classIds.includes(e.class_id)).toArray()
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

        const termCommentary = annotations.find(a => a.term_id === term.id && a.section_key.includes('commentary'))?.content || "";

        return {
            term,
            classes: classAnalytics,
            assessments: assessments.sort((a, b) => (a.date || '').localeCompare(b.date || '')),
            evidence: evidence.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || '')),
            commentary: termCommentary
        };
    }));

    const introNotes = annotations.find(a => !a.term_id && a.section_key === 'cover.reflection')?.content || "";

    return { termChapters, introNotes };
};

export const generateTeacherFilePDF = async (
    year: AcademicYear,
    profile: SchoolProfile,
    specificTermId?: string
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const { termChapters, introNotes } = await fetchTeacherFileData(year.id, specificTermId);
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    // --- COVER PAGE ---
    if (!specificTermId) {
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

    // --- INDEX PAGE ---
    if (!specificTermId) {
        addHeader(doc, profile, "Table of Contents");
        let indexY = 60;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Section B: Term Performance Records", margin, indexY);
        indexY += 10;

        termChapters.forEach((ch, idx) => {
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`${idx + 1}. ${ch.term.name}`, margin + 5, indexY);
            doc.text(`Chapter ${idx + 1}`, pageWidth - margin - 20, indexY, { align: 'right' });
            indexY += 8;
        });

        addFooter(doc);
        doc.addPage();
    }

    // --- TERM CHAPTERS ---
    termChapters.forEach((ch, chIdx) => {
        if (chIdx > 0) doc.addPage();
        
        const startY = addHeader(doc, profile, `${ch.term.name} Consolidated Record`);
        let currentY = startY + 5;

        // 1. Term Stats Summary
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Academic Classes Summary", margin, currentY);
        
        autoTable(doc, {
            startY: currentY + 3,
            head: [['Class', 'Subject', 'Learners', 'Avg %', 'Pass %']],
            body: ch.classes.map(c => [c.name, c.subject, c.learnerCount, `${c.avg}%`, `${c.passRate}%`]),
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 37, 36] }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;

        // 2. Assessment List
        doc.text("Formal Assessment Schedule", margin, currentY);
        autoTable(doc, {
            startY: currentY + 3,
            head: [['Task Title', 'Type', 'Max Mark', 'Weight']],
            body: ch.assessments.map(a => [a.title, a.type, a.max_mark, `${a.weight}%`]),
            theme: 'striped',
            styles: { fontSize: 8 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;

        // 3. Evidence Audit Log
        doc.text("Evidence & Moderation Registry", margin, currentY);
        if (ch.evidence.length === 0) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "italic");
            doc.text("No evidence files attached for this term.", margin, currentY + 8);
            currentY += 15;
        } else {
            autoTable(doc, {
                startY: currentY + 3,
                head: [['File Name', 'Category', 'Date Uploaded']],
                body: ch.evidence.map(e => [e.file_name, e.category, e.created_at ? format(new Date(e.created_at), 'dd/MM/yyyy') : 'N/A']),
                theme: 'plain',
                styles: { fontSize: 8 }
            });
            currentY = (doc as any).lastAutoTable.finalY + 10;
        }

        // 4. Commentary
        if (ch.commentary) {
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Professional Administrative Commentary", margin, currentY);
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "italic");
            const splitComm = doc.splitTextToSize(ch.commentary, pageWidth - (margin * 2));
            doc.text(splitComm, margin, currentY + 6);
            currentY += 10 + (splitComm.length * 5);
        }

        addSignatures(doc, currentY);
        addFooter(doc);
    });

    const filename = specificTermId 
        ? `TeacherFile_${year.name}_${termChapters[0].term.name.replace(' ', '')}.pdf`
        : `TeacherFile_FullRecord_${year.name}.pdf`;

    doc.save(filename);
};