import JSZip from 'jszip';
import { db } from '@/db';
import { generateClassPDF } from '@/utils/pdf/marksheetReport';
import { generateDiagnosticReportPDF } from '@/utils/pdf/diagnosticReport';
import { generatePOAPDF, generateModerationSamplePDF, generateEvidenceIndexPDF } from '@/utils/pdf/packGenerators';
import { generateSASAMSExport } from '@/utils/sasams';
import { calculateDiagnosticDataCore } from '@/utils/diagnosticsCore';

function safeString(value: unknown, fallback = 'unknown') {
    return (value ?? fallback).toString();
}

/** Safe segment for ZIP / folder names (alphanumeric + underscore). */
function safeFileNamePart(value: unknown, fallback = 'unknown') {
    return safeString(value, fallback)
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
}

export const generateAndDownloadExportPack = async (
    classId: string,
    termId: string,
    yearId: string,
    settings: any
) => {
    const classInfo = await db.classes.get(classId);
    const termInfo = await db.terms.get(termId);
    const yearInfo = await db.academic_years.get(yearId);

    if (!classInfo || !termInfo || !yearInfo) throw new Error('Missing academic context.');

    const learnersRaw = await db.learners.where('class_id').equals(classId).toArray();
    const learners = learnersRaw
        .map((l) => ({ ...l, name: safeString(l.name, 'Unknown learner') }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const assessmentsRaw = await db.assessments.where('[class_id+term_id]').equals([classId, termId]).toArray();
    const assessments = assessmentsRaw.map((a) => ({
        ...a,
        title: safeString(a.title, 'Assessment'),
    }));
    const assessmentIds = assessments.map((a) => a.id);
    const marks =
        assessmentIds.length > 0
            ? await db.assessment_marks.where('assessment_id').anyOf(assessmentIds).toArray()
            : [];

    const evidence = await db.evidence.where('class_id').equals(classId).filter((e) => e.term_id === termId).toArray();
    const sample = await db.moderation_samples.where('[academic_year_id+term_id+class_id]').equals([yearId, termId, classId]).first();

    const classNameSafe = safeString(classInfo.className, 'Class');
    const termNameSafe = safeString(termInfo.name, 'Term');
    const yearNameSafe = safeString(yearInfo.name, 'Year');
    const gradeSafe = safeString(classInfo.grade, '');
    const subjectSafe = safeString(classInfo.subject, '');

    const fullClassInfo = {
        ...classInfo,
        className: classNameSafe,
        grade: gradeSafe,
        subject: subjectSafe,
        learners,
    };

    const profile = {
        name: safeString(settings?.schoolName, 'School'),
        teacher: safeString(settings?.teacherName, ''),
        logo: settings?.schoolLogo,
        email: safeString(settings?.contactEmail, ''),
        phone: safeString(settings?.contactPhone, ''),
    };

    try {
        const zip = new JSZip();
        const folderName = `Term_Export_Pack_${safeFileNamePart(classNameSafe, 'class')}_${safeFileNamePart(termNameSafe, 'term')}`;
        const folder = zip.folder(folderName);

        if (!folder) throw new Error('Failed to initialize zip folder');

        const marksheetBlob = generateClassPDF(
            fullClassInfo,
            settings.gradingScheme,
            profile.name,
            profile.teacher,
            profile.logo,
            profile.email,
            profile.phone,
            undefined,
            false,
            assessments,
            marks,
            { ...yearInfo, name: yearNameSafe },
            settings.atRiskThreshold,
            true
        ) as Blob;
        folder.file('01_Marksheet_Record.pdf', marksheetBlob);

        const poaBlob = generatePOAPDF(assessments, classNameSafe, termNameSafe, profile, true) as Blob;
        folder.file('02_Programme_of_Assessment.pdf', poaBlob);

        const modBlob = generateModerationSamplePDF(sample || null, learners, classNameSafe, termNameSafe, profile, true) as Blob;
        folder.file('03_Moderation_Sample.pdf', modBlob);

        const evBlob = generateEvidenceIndexPDF(learners, evidence, classNameSafe, termNameSafe, profile, true) as Blob;
        folder.file('04_Moderation_Index.pdf', evBlob);

        const diagData = calculateDiagnosticDataCore(fullClassInfo, settings.atRiskThreshold, assessments, marks);
        const savedDiag =
            assessments.length > 0 ? await db.diagnostics.where('assessment_id').equals(assessments[0].id).first() : null;

        let interventionPlan = 'No specific interventions documented.';
        try {
            if (savedDiag?.interventions) {
                const parsed = JSON.parse(savedDiag.interventions);
                interventionPlan = (parsed.interventions || []).join('\n');
            }
        } catch {
            /* keep default */
        }

        const diagBlob = (await generateDiagnosticReportPDF(
            diagData,
            { className: classNameSafe, subject: subjectSafe, grade: gradeSafe },
            { year: yearNameSafe, term: termNameSafe, isLocked: true },
            profile,
            diagData.autoSummary,
            interventionPlan,
            true
        )) as Blob;
        folder.file('05_Diagnostic_Summary.pdf', diagBlob);

        const sasamsCsv = generateSASAMSExport(
            learners,
            classNameSafe,
            gradeSafe,
            subjectSafe,
            termNameSafe,
            yearNameSafe,
            profile.teacher,
            safeString(settings?.schoolCode, ''),
            true
        ) as string;
        folder.file('06_SASAMS_Marks_Summary.csv', sasamsCsv);

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${folderName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('ZIP Assembly Error', error);
        throw new Error('Some data is missing (e.g. learner or assessment name). Please check your inputs.');
    }
};
