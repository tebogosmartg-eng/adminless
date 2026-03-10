import { AssessmentQuestion, DiagnosticRow, CognitiveLevel } from '@/lib/types';
import { QuestionStat } from '@/hooks/useQuestionAnalysis';

type PerformanceBand = 'severe' | 'partial' | 'developing' | 'secure';

const determineBand = (avg: number): PerformanceBand => {
  if (avg < 30) return 'severe';
  if (avg < 50) return 'partial';
  if (avg < 70) return 'developing';
  return 'secure';
};

const identifySubjectCategory = (subject: string): 'math' | 'language' | 'science' | 'general' => {
  const s = subject.toLowerCase();
  if (s.includes('math') || s.includes('accounting')) return 'math';
  if (s.includes('english') || s.includes('afrikaans') || s.includes('language') || s.includes('isi')) return 'language';
  if (s.includes('science') || s.includes('physics') || s.includes('biology') || s.includes('life')) return 'science';
  return 'general';
};

export const buildQuestionDiagnosis = (
  stat: QuestionStat,
  qDef: AssessmentQuestion | undefined,
  classSubject: string
): DiagnosticRow => {
  const band = determineBand(stat.avg);
  const category = identifySubjectCategory(classSubject);
  
  const skill = qDef?.skill_description || stat.skill || 'this assessed skill';
  const topic = qDef?.topic || 'the current topic';
  const cogLevel = qDef?.cognitive_level || 'unknown';

  let causes: string[] = [];
  let interventions: string[] = [];
  let summary = `Class average: ${stat.avg}%. Pass rate: ${stat.passRate}%. `;

  // --- Band Specific Logic ---
  if (band === 'severe') {
    summary += "Critical foundational gaps detected. Immediate intervention required.";
    causes.push(`Fundamental breakdown in core understanding related to ${topic}.`);
    interventions.push(`Back-to-basics reteaching of ${topic} fundamentals.`);
  } else if (band === 'partial') {
    summary += "Inconsistent performance. Partial understanding demonstrated.";
    causes.push(`Inconsistent application of procedures or concepts in ${skill}.`);
    interventions.push(`Step-by-step scaffolding and guided practice on ${skill}.`);
  } else if (band === 'developing') {
    summary += "Developing competence, but lacks refinement or deeper analysis.";
    causes.push(`Basic understanding present, but struggles with nuances of ${skill}.`);
    interventions.push(`Targeted practice on complex variations and extension questions.`);
  } else {
    summary += "Secure understanding demonstrated by the majority of the class.";
    causes.push(`Solid grasp of ${topic}. Errors are likely careless mistakes or isolated gaps.`);
    interventions.push(`Enrichment tasks and peer-tutoring opportunities.`);
  }

  // --- Subject Specific Enhancements (Only applied if performance is below secure) ---
  if (band !== 'secure') {
    if (category === 'math') {
        if (cogLevel === 'application' || cogLevel === 'analysis') {
            causes.push("Difficulty translating word problems into mathematical models.");
            interventions.push("Practice breaking down word problems and identifying key variables.");
        } else {
            causes.push("Computational errors or misunderstanding of operational rules.");
            interventions.push("Provide worked examples highlighting common error points.");
        }
    } else if (category === 'language') {
        if (cogLevel === 'analysis' || cogLevel === 'evaluation') {
            causes.push("Struggle to provide supporting textual evidence for arguments.");
            interventions.push("Use structured reading frames (e.g., P.E.E. paragraphs).");
        } else {
            causes.push("Gaps in vocabulary or sentence construction conventions.");
            interventions.push("Explicit grammar drills and vocabulary building exercises.");
        }
    } else if (category === 'science') {
        if (cogLevel === 'application') {
            causes.push("Knows the vocabulary but struggles to apply principles to unfamiliar scenarios.");
            interventions.push("Cause-and-effect charting and scenario-based application tasks.");
        } else {
            causes.push("Major conceptual misunderstanding of scientific phenomenon.");
            interventions.push("Demonstrations, visual models, or concept mapping.");
        }
    } else {
        // General fallback
        if (cogLevel === 'knowledge' || cogLevel === 'comprehension') {
            causes.push(`Poor retention of factual knowledge regarding ${topic}.`);
            interventions.push("Implement spaced repetition and active recall techniques.");
        }
    }
  }

  return {
    id: stat.id,
    question: `Q${stat.number}`,
    cognitive_level: qDef?.cognitive_level,
    performance_summary: summary,
    possible_root_causes: causes,
    targeted_interventions: interventions
  };
};