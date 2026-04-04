import JSZip from 'jszip';
import { db } from '@/db';
import { generateClassPDF } from '@/utils/pdf/marksheetReport';
import { generateDiagnosticReportPDF } from '@/utils/pdf/diagnosticReport';
import { generatePOAPDF, generateModerationSamplePDF, generateEvidenceIndexPDF } from '@/utils/pdf/packGenerators';
import { generateSASAMSExport } from '@/utils/sasams';
import { calculateDiagnosticDataCore } from '@/utils/diagnosticsCore';

export const generateAndDownloadExportPack = async (
    classId: string, 
    termId: string, 
    yearId: string, 
    settings: any
) => {
    try {
        const classInfo = await db.classes.get(classId);
        const termInfo = await db.terms.get(termId);
        const yearInfo = await db.academic_years.get(yearId);
        
        if (!classInfo || !termInfo || !yearInfo) throw new Error("Missing academic context.");

        const learners = await db.learners.where('class_id').equals(classId).toArray();
        const fullClassInfo = { ...classInfo, learners: learners.sort((a,b) => a.name.localeCompare(b.name)) };

        const assessments = await db.assessments.where('[class_id+term_id]').equals([classId, termId]).toArray();
        const assessmentIds = assessments.map(a => a.id);
        const marks = assessmentIds.length > 0 
            ? await db.assessment_marks.where('assessment_id').anyOf(assessmentIds).toArray() 
            : [];
        
        const evidence = await db.evidence.where('class_id').equals(classId).filter(e => e.term_id === termId).toArray();
        const sample = await db.moderation_samples.where('[academic_year_id+term_id+class_id]').equals([yearId, termId, classId]).first();

        // Prepare School Profile
        const profile = {
            name: settings.schoolName,
            teacher: settings.teacherName,
            logo: settings.schoolLogo,
            email: settings.contactEmail,
            phone: settings.contactPhone
        };

        const zip = new JSZip();
        const folderName = `Term_Export_Pack_${classInfo.className.replace(/\s+/g, '_')}_${termInfo.name.replace(/\s+/g, '')}`;
        const folder = zip.folder(folderName);

        if (!folder) throw new Error("Failed to initialize zip folder");

        // 1. Marksheet Record
        const marksheetBlob = generateClassPDF(
            fullClassInfo, settings.gradingScheme, profile.name, profile.teacher, profile.logo, profile.email, profile.phone,
            undefined, false, assessments, marks, yearInfo, settings.atRiskThreshold, true
        ) as Blob;
        folder.file('01_Marksheet_Record.pdf', marksheetBlob);

        // 2. Programme of Assessment
        const poaBlob = generatePOAPDF(assessments, classInfo.className, termInfo.name, profile, true) as Blob;
        folder.file('02_Programme_of_Assessment.pdf', poaBlob);

        // 3. Moderation Sample
        const modBlob = generateModerationSamplePDF(sample || null, learners, classInfo.className, termInfo.name, profile, true) as Blob;
        folder.file('03_Moderation_Sample.pdf', modBlob);

        // 4. Evidence Index
        const evBlob = generateEvidenceIndexPDF(learners, evidence, classInfo.className, termInfo.name, profile, true) as Blob;
        folder.file('04_Evidence_Index.pdf', evBlob);

        // 5. Diagnostic Summary
        const diagData = calculateDiagnosticDataCore(fullClassInfo, settings.atRiskThreshold, assessments, marks);
        const savedDiag = assessments.length > 0 
            ? await db.diagnostics.where('assessment_id').equals(assessments[0].id).first() 
            : null;
        
        let interventionPlan = "No specific interventions documented.";
        try {
            if (savedDiag?.interventions) {
                const parsed = JSON.parse(savedDiag.interventions);
                interventionPlan = (parsed.interventions || []).join('\n');
            }
        } catch(e) {}

        const diagBlob = (await generateDiagnosticReportPDF(
            diagData, 
            { className: classInfo.className, subject: classInfo.subject, grade: classInfo.grade },
            { year: yearInfo.name, term: termInfo.name, isLocked: true },
            profile,
            diagData.autoSummary,
            interventionPlan,
            true
        )) as Blob;
        folder.file('05_Diagnostic_Summary.pdf', diagBlob);

        // 6. SA-SAMS Ready Export
        const sasamsCsv = generateSASAMSExport(
            learners, classInfo.className, classInfo.grade, classInfo.subject, termInfo.name, yearInfo.name, profile.teacher, settings.schoolCode, true
        ) as string;
        folder.file('06_SASAMS_Marks_Summary.csv', sasamsCsv);

        // Package and Download
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${folderName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("ZIP Assembly Error:", error);
        throw error;
    }
};