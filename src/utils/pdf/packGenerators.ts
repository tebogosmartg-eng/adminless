import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Assessment, Learner, ModerationSample, Evidence } from '@/lib/types';
import { addHeader, addFooter, addSignatures, SchoolProfile } from './base';
import { format } from 'date-fns';

export const generatePOAPDF = (
    assessments: Assessment[],
    className: string,
    termName: string,
    profile: SchoolProfile,
    returnBlob: boolean = true
): Blob | void => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 14;
    const startY = addHeader(doc, profile, `Programme of Assessment`);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Class: ${className} | Term: ${termName}`, margin, startY + 5);

    autoTable(doc, {
        startY: startY + 10,
        head: [['#', 'Task Title', 'Type', 'Max Mark', 'Weighting', 'Date Recorded']],
        body: assessments.map((a, i) => [
            i + 1,
            a.title,
            a.type,
            a.max_mark,
            `${a.weight}%`,
            a.date ? format(new Date(a.date), 'dd/MM/yyyy') : 'N/A'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [41, 37, 36], textColor: 255 },
        styles: { fontSize: 9 }
    });

    addSignatures(doc, (doc as any).lastAutoTable.finalY);
    addFooter(doc);

    if (returnBlob) return doc.output('blob');
};

export const generateModerationSamplePDF = (
    sample: ModerationSample | null,
    learners: Learner[],
    className: string,
    termName: string,
    profile: SchoolProfile,
    returnBlob: boolean = true
): Blob | void => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 14;
    const startY = addHeader(doc, profile, `Moderation Sample Audit`);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Class: ${className} | Term: ${termName}`, margin, startY + 5);

    if (!sample) {
        doc.text("No formal moderation sample generated for this class.", margin, startY + 15);
    } else {
        doc.text(`Selection Basis: ${sample.rules_json.basis === 'term_overall' ? 'Overall Term Average' : 'Specific Task'}`, margin, startY + 12);
        
        const sampleLearners = learners.filter(l => l.id && sample.learner_ids.includes(l.id));
        
        autoTable(doc, {
            startY: startY + 20,
            head: [['Learner Name', 'Final Term Average', 'Sample Validation']],
            body: sampleLearners.map(l => [
                l.name,
                `${l.mark || 0}%`,
                "Selected for Audit"
            ]),
            theme: 'grid',
            headStyles: { fillColor: [41, 37, 36], textColor: 255 },
            styles: { fontSize: 9 }
        });
    }

    addSignatures(doc, (doc as any).lastAutoTable?.finalY || startY + 30);
    addFooter(doc);

    if (returnBlob) return doc.output('blob');
};

export const generateEvidenceIndexPDF = (
    learners: Learner[],
    evidence: Evidence[],
    className: string,
    termName: string,
    profile: SchoolProfile,
    returnBlob: boolean = true
): Blob | void => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const margin = 14;
    const startY = addHeader(doc, profile, `Evidence & Script Register`);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Class: ${className} | Term: ${termName}`, margin, startY + 5);

    autoTable(doc, {
        startY: startY + 10,
        head: [['Learner Name', 'Script Attachments', 'Status']],
        body: learners.map(l => {
            const count = evidence.filter(e => e.learner_id === l.id && e.category === 'script').length;
            return [
                l.name,
                count.toString(),
                count > 0 ? "Uploaded" : "Pending"
            ];
        }),
        theme: 'grid',
        headStyles: { fillColor: [41, 37, 36], textColor: 255 },
        styles: { fontSize: 9 },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
                if (data.cell.text[0] === 'Pending') data.cell.styles.textColor = [220, 38, 38];
                else data.cell.styles.textColor = [22, 163, 74];
            }
        }
    });

    addSignatures(doc, (doc as any).lastAutoTable.finalY);
    addFooter(doc);

    if (returnBlob) return doc.output('blob');
};