import jsPDF from 'jspdf';
import { Learner, GradeSymbol } from '@/lib/types';
import { getGradeSymbol } from '../grading';
import { addHeader, addFooter, SchoolProfile, AttendanceStats } from './base';
import { t, translateText } from '@/lib/useTranslation';
import { AssessmentResult } from '@/hooks/useLearnerAssessmentData';
import { LearnerAnalyticsTrend } from '@/hooks/useLearnerAnalytics';
import { buildLearnerComment } from '@/utils/learnerComment';
import { PASS_THRESHOLD } from '@/constants/diagnostics';

interface LearnerReportAnalytics {
  chartData: Array<{ id: string; date: string; score: number }>;
  assessments: AssessmentResult[];
  weakAreas: AssessmentResult[];
  trend: LearnerAnalyticsTrend;
  weightedAverage: number;
  highestScore: number;
  lowestScore: number;
  totalAssessments: number;
}

const SAFE_ANALYTICS_DEFAULTS: LearnerReportAnalytics = {
  chartData: [],
  assessments: [],
  weakAreas: [],
  trend: 'stable',
  weightedAverage: 0,
  highestScore: 0,
  lowestScore: 0,
  totalAssessments: 0
};

const getTrendMeta = (trend: LearnerAnalyticsTrend) => {
  if (trend === 'up') return { label: 'Improving', icon: 'UP', color: [22, 163, 74] as const };
  if (trend === 'down') return { label: 'Declining', icon: 'DOWN', color: [220, 38, 38] as const };
  return { label: 'Stable', icon: 'FLAT', color: [217, 119, 6] as const };
};

const getScoreColor = (score: number): [number, number, number] => {
  if (score >= 75) return [22, 163, 74];
  if (score >= PASS_THRESHOLD) return [217, 119, 6];
  return [220, 38, 38];
};

const getDisplayScore = (assessment: AssessmentResult): number | null => {
  if (assessment.percentage !== null && Number.isFinite(assessment.percentage)) return assessment.percentage;
  if (assessment.score !== null && assessment.max && assessment.max > 0) {
    return Number(((assessment.score / assessment.max) * 100).toFixed(1));
  }
  if (assessment.score !== null && Number.isFinite(assessment.score)) return assessment.score;
  return null;
};

const fmtDate = (date?: string) => {
  if (!date) return 'N/A';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};

const toFinitePercent = (value: unknown, fallback = 0): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, numeric));
};

const sanitizeAnalytics = (analytics?: LearnerReportAnalytics): LearnerReportAnalytics => {
  if (!analytics) return SAFE_ANALYTICS_DEFAULTS;
  return {
    chartData: Array.isArray(analytics.chartData)
      ? analytics.chartData
        .filter((point) => point && typeof point === 'object')
        .map((point) => ({
          id: point.id ?? '',
          date: point.date ?? '',
          score: toFinitePercent(point.score, 0)
        }))
      : [],
    assessments: Array.isArray(analytics.assessments) ? analytics.assessments : [],
    weakAreas: Array.isArray(analytics.weakAreas) ? analytics.weakAreas : [],
    trend: analytics.trend ?? 'stable',
    weightedAverage: toFinitePercent(analytics.weightedAverage, 0),
    highestScore: toFinitePercent(analytics.highestScore, 0),
    lowestScore: toFinitePercent(analytics.lowestScore, 0),
    totalAssessments: Number.isFinite(analytics.totalAssessments) ? analytics.totalAssessments : 0
  };
};

const getNarrativeInsight = (average: number, trend: LearnerAnalyticsTrend, weakAreaCount: number) => {
  const trendText = trend === 'up' ? 'improving' : trend === 'down' ? 'declining' : 'stable';
  if (average >= 70 && weakAreaCount === 0) {
    return `Performance remains strong overall, with ${trendText} outcomes and consistent mastery across assessments.`;
  }
  if (average >= 70) {
    return `Performance remains strong overall, but selected weak areas suggest gaps in applied understanding.`;
  }
  if (average >= PASS_THRESHOLD) {
    return `Performance is developing, and targeted reinforcement can improve consistency in upcoming assessments.`;
  }
  return `Performance is below expected level, and immediate intervention is required to close core learning gaps.`;
};

const getHeadlineInsight = (average: number, trend: LearnerAnalyticsTrend, weakAreaCount: number) => {
  if (trend === 'down') {
    return 'Declining performance trend requires immediate intervention.';
  }
  if (average >= 70 && weakAreaCount > 0) {
    return 'Strong theoretical performance, but significant drop in practical application.';
  }
  if (trend === 'stable' && average >= PASS_THRESHOLD) {
    return 'Consistent performance with stable progression across assessments.';
  }
  if (trend === 'up' && average >= 70) {
    return 'Strong and improving performance across assessments.';
  }
  return 'Performance trajectory indicates targeted support is needed for stronger outcomes.';
};

const addSectionTitle = (doc: jsPDF, title: string, y: number, margin: number) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(31, 41, 55);
  doc.text(title, margin, y);
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y + 3, doc.internal.pageSize.width - margin, y + 3);
};

const truncateLabel = (value: string, maxLength: number) => {
  const safe = (value || '').trim();
  if (!safe) return 'N/A';
  if (safe.length <= maxLength) return safe;
  return `${safe.slice(0, Math.max(1, maxLength - 3))}...`;
};

const drawWrappedText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 4
) => {
  const content = (text || '').trim();
  const lines = doc.splitTextToSize(content || 'No data available', maxWidth);
  doc.text(lines, x, y);
  return lines.length * lineHeight;
};

const addLearnerReportPage = async (
  doc: jsPDF,
  learner: Learner,
  classInfo: { subject: string; grade: string; className: string },
  gradingScheme: GradeSymbol[],
  profile: SchoolProfile,
  attendance?: AttendanceStats,
  analyticsInput?: LearnerReportAnalytics,
  lang: string = 'en'
) => {
  const analytics = sanitizeAnalytics(analyticsInput);
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const accentColor: [number, number, number] = [37, 99, 235];
  const lineHeight = 4;
  const sectionSpacing = 8;
  const finalScore = analytics.weightedAverage;
  let y = addHeader(doc, profile, t('learnerPerformanceReport', lang)) + 8;

  const ensureSpace = (requiredHeight: number) => {
    if (y + requiredHeight <= pageHeight - 20) return;
    doc.addPage();
    y = addHeader(doc, profile, t('learnerPerformanceReport', lang)) + 8;
  };

  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(10, 10, pageWidth - 20, 3, 'F');
  doc.setDrawColor(220);
  doc.setLineWidth(0.1);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y - 2, pageWidth - margin, y - 2);

  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.text(`${t('learner', lang)}:`, margin + 4, y + 8);
  doc.text(`${t('grade', lang)}:`, margin + 4, y + 16);
  doc.text(`${t('class', lang)}:`, margin + 70, y + 16);
  doc.text(`${t('subject', lang)}:`, margin + 130, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(truncateLabel(learner.name || 'Unknown learner', 28), margin + 24, y + 8);
  doc.text(truncateLabel(classInfo.grade || 'N/A', 10), margin + 24, y + 16);
  doc.text(truncateLabel(classInfo.className || 'N/A', 16), margin + 86, y + 16);
  doc.text(truncateLabel(classInfo.subject || 'N/A', 12), margin + 148, y + 16);
  y += 34;

  const headlineScore = finalScore;
  const headlineInsight = getHeadlineInsight(headlineScore, analytics.trend, analytics.weakAreas.length);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  y += drawWrappedText(doc, headlineInsight, margin, y, pageWidth - margin * 2, lineHeight);
  y += sectionSpacing / 2;

  ensureSpace(50);
  addSectionTitle(doc, 'Performance Summary', y, margin);
  y += 10;
  const highest = analytics.highestScore;
  const totalAssessments = analytics.totalAssessments;
  const trend = analytics.trend;
  const symbolObj = getGradeSymbol(finalScore, gradingScheme);
  const trendMeta = getTrendMeta(trend);
  const scoreColor = getScoreColor(finalScore);
  const cardsGap = 4;
  const cardW = (pageWidth - margin * 2 - cardsGap * 3) / 4;
  const cardH = 22;
  const cardY = y;
  const kpis = [
    { label: 'Average (Trend)', value: `${Number.isFinite(finalScore) ? finalScore.toFixed(1) : 'N/A'}%`, color: scoreColor },
    { label: 'Trend', value: trendMeta.label, color: trendMeta.color },
    { label: 'Highest', value: `${highest.toFixed(1)}%`, color: [22, 163, 74] as [number, number, number] },
    { label: 'Assessments', value: `${totalAssessments}`, color: [55, 65, 81] as [number, number, number] }
  ];
  kpis.forEach((kpi, index) => {
    const x = margin + index * (cardW + cardsGap);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(kpi.label, x + 3, cardY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, x + 3, cardY + 15);
  });
  const narrative = getNarrativeInsight(finalScore, trend, analytics.weakAreas.length);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  const narrativeHeight = drawWrappedText(doc, narrative, margin, cardY + cardH + 7, pageWidth - margin * 2, lineHeight);
  if (symbolObj) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(`${t('symbol', lang)}: ${symbolObj.symbol}  |  ${t('level', lang)}: ${symbolObj.level}`, pageWidth - margin, cardY + cardH + 13, { align: 'right' });
  }
  y += 38 + narrativeHeight;

  ensureSpace(76);
  addSectionTitle(doc, 'Performance Over Time', y, margin);
  y += 10;
  const graphX = margin;
  const graphY = y + 4;
  const graphW = pageWidth - margin * 2;
  const graphH = 42;
  const graphLabelOffset = 9;
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('%', graphX - 6, graphY + 2);
  doc.text('Assessment', graphX + graphW / 2, graphY + graphH + graphLabelOffset + 5, { align: 'center' });
  doc.setDrawColor(229, 231, 235);
  doc.rect(graphX, graphY, graphW, graphH);
  const points = analytics.chartData;
  if (points.length > 1) {
    const maxScore = 100;
    const minScore = 0;
    const xStep = graphW / (points.length - 1);
    const pointCoords: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const x = graphX + (i * graphW) / (points.length - 1);
      const pointY = graphY + graphH - ((toFinitePercent(p.score, 0) - minScore) / (maxScore - minScore)) * graphH;
      pointCoords.push({ x, y: pointY });
    }
    try {
      const areaPoints = [
        ...pointCoords,
        { x: graphX + graphW, y: graphY + graphH },
        { x: graphX, y: graphY + graphH }
      ];
      const maybeAnyDoc = doc as any;
      if (typeof maybeAnyDoc.setGState === 'function' && typeof maybeAnyDoc.GState === 'function') {
        maybeAnyDoc.setGState(new maybeAnyDoc.GState({ opacity: 0.12 }));
        doc.setDrawColor(191, 219, 254);
        doc.setFillColor(191, 219, 254);
        doc.lines(
          areaPoints.slice(1).map((p, idx) => [p.x - areaPoints[idx].x, p.y - areaPoints[idx].y]),
          areaPoints[0].x,
          areaPoints[0].y,
          [1, 1],
          'F',
          true
        );
        maybeAnyDoc.setGState(new maybeAnyDoc.GState({ opacity: 1 }));
      }
    } catch (error) {
      console.error('[learnerReport] chart area fill failed, continuing without fill', error);
    }
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const x1 = graphX + i * xStep;
      const x2 = graphX + (i + 1) * xStep;
      const y1 = graphY + graphH - ((toFinitePercent(p1.score, 0) - minScore) / (maxScore - minScore)) * graphH;
      const y2 = graphY + graphH - ((toFinitePercent(p2.score, 0) - minScore) / (maxScore - minScore)) * graphH;
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.8);
      doc.line(x1, y1, x2, y2);
      doc.setFillColor(37, 99, 235);
      doc.circle(x1, y1, 1.2, 'F');
      if (i === points.length - 2) doc.circle(x2, y2, 1.2, 'F');
    }
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    const startLabel = truncateLabel(fmtDate(points[0].date), 10);
    const endLabel = truncateLabel(fmtDate(points[points.length - 1].date), 10);
    const labelY = graphY + graphH + graphLabelOffset;
    doc.text(startLabel, graphX, labelY);
    if (points.length > 2) {
      doc.text(endLabel, graphX + graphW, labelY, { align: 'right' });
    }
  } else {
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text('Not enough assessments for a trend line yet.', graphX + graphW / 2, graphY + graphH / 2, { align: 'center' });
  }
  y += 62;

  ensureSpace(24);
  addSectionTitle(doc, 'Assessment Breakdown', y, margin);
  y += 10;
  const assessments = analytics.assessments;
  const drawAssessmentTableHeader = () => {
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y - 5, pageWidth - margin * 2, 7, 'F');
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'bold');
    doc.text('Assessment', tableCols.title, y);
    doc.text('Date', tableCols.date, y);
    doc.text('Score', tableCols.score, y);
    doc.text('Weight', tableCols.weight, y);
  };
  const tableCols = {
    title: margin,
    date: margin + 80,
    score: margin + 115,
    weight: margin + 145
  };
  drawAssessmentTableHeader();
  const scoreValues = assessments
    .map((assessment) => getDisplayScore(assessment))
    .filter((value): value is number => value !== null);
  const maxScore = scoreValues.length ? Math.max(...scoreValues) : null;
  const minScore = scoreValues.length ? Math.min(...scoreValues) : null;
  y += 6;
  doc.setFont('helvetica', 'normal');
  if (!assessments || assessments.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    y += drawWrappedText(doc, 'No assessments available for this reporting period.', margin, y + 2, pageWidth - margin * 2, lineHeight);
    y += 10;
  }
  for (let index = 0; index < assessments.length; index++) {
    const assessment = assessments[index];
    if (y + 9 > pageHeight - 24) {
      doc.addPage();
      y = addHeader(doc, profile, t('learnerPerformanceReport', lang)) + 8;
      addSectionTitle(doc, 'Assessment Breakdown (continued)', y, margin);
      y += 10;
      drawAssessmentTableHeader();
      y += 6;
      doc.setFont('helvetica', 'normal');
    }
    const score = getDisplayScore(assessment);
    const color = score !== null ? getScoreColor(score) : ([107, 114, 128] as [number, number, number]);
    const safeTitle = assessment.assessmentTitle || 'Untitled assessment';
    const title = safeTitle.length > 32 ? `${safeTitle.slice(0, 29)}...` : safeTitle;
    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y - 4.5, pageWidth - margin * 2, 7, 'F');
    }
    doc.setTextColor(31, 41, 55);
    doc.text(title, tableCols.title, y);
    doc.setTextColor(107, 114, 128);
    doc.text(fmtDate(assessment.date), tableCols.date, y);
    const barX = tableCols.score + 22;
    const barY = y - 3.2;
    const barW = 18;
    const barH = 2.6;
    doc.setFillColor(229, 231, 235);
    doc.roundedRect(barX, barY, barW, barH, 1, 1, 'F');
    if (score !== null) {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(barX, barY, (Math.max(0, Math.min(100, score)) / 100) * barW, barH, 1, 1, 'F');
    }
    const isHigh = score !== null && maxScore !== null && Math.abs(score - maxScore) < 0.001;
    const isLow = score !== null && minScore !== null && Math.abs(score - minScore) < 0.001;
    if (isHigh) {
      doc.setTextColor(22, 163, 74);
    } else if (isLow) {
      doc.setTextColor(220, 38, 38);
    } else {
      doc.setTextColor(color[0], color[1], color[2]);
    }
    doc.text(score !== null ? `${score.toFixed(1)}%` : 'N/A', tableCols.score, y);
    doc.setTextColor(55, 65, 81);
    doc.text(`${assessment.weight ?? 0}%`, tableCols.weight, y);
    doc.setDrawColor(243, 244, 246);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 7.5;
  }

  ensureSpace(64);
  addSectionTitle(doc, 'Key Learning Insights', y, margin);
  y += 10;
  const weakAreas = Array.from(
    new Map(
      (analytics.weakAreas || []).map((item) => {
        const key = `${(item.assessmentTitle || '').trim().toLowerCase()}|${fmtDate(item.date)}`;
        return [key, item];
      })
    ).values()
  );
  const sortedByScore = [...assessments]
    .map((assessment) => ({ assessment, score: getDisplayScore(assessment) }))
    .filter((item): item is { assessment: AssessmentResult; score: number } => item.score !== null)
    .sort((a, b) => b.score - a.score);
  const strengths = sortedByScore.slice(0, 4).map((item) => item.assessment);

  const boxW = pageWidth - margin * 2;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, y - 4, boxW, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(220, 38, 38);
  doc.text('Weak Areas:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  y += 6;
  if (!weakAreas || weakAreas.length === 0) {
    doc.setTextColor(75, 85, 99);
    y += drawWrappedText(doc, '- No critical weak areas identified', margin + 3, y, boxW - 8, lineHeight);
  } else {
    for (const weak of weakAreas.slice(0, 4)) {
      const score = getDisplayScore(weak);
      const weakText = `- ${truncateLabel(weak.assessmentTitle || 'Untitled assessment', 42)} (${score !== null ? `${score.toFixed(1)}%` : 'N/A'})`;
      doc.setTextColor(75, 85, 99);
      y += drawWrappedText(doc, weakText, margin + 3, y, boxW - 8, lineHeight);
      y += 2;
    }
  }
  y += sectionSpacing;

  ensureSpace(28);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, y - 4, boxW, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(22, 163, 74);
  doc.text('Strengths:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  y += 6;
  if (!strengths || strengths.length === 0) {
    doc.setTextColor(75, 85, 99);
    y += drawWrappedText(doc, '- Strength profile still emerging', margin + 3, y, boxW - 8, lineHeight);
  } else {
    for (const strong of strengths.slice(0, 4)) {
      const score = getDisplayScore(strong);
      const strengthText = `- ${truncateLabel(strong.assessmentTitle || 'Untitled assessment', 42)} (${score !== null ? `${score.toFixed(1)}%` : 'N/A'})`;
      doc.setTextColor(75, 85, 99);
      y += drawWrappedText(doc, strengthText, margin + 3, y, boxW - 8, lineHeight);
      y += 2;
    }
  }
  y += sectionSpacing;

  ensureSpace(34);
  addSectionTitle(doc, 'Recommended Next Steps', y, margin);
  y += 10;
  const actions: Array<{ text: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }> = [];
  if (trend === 'down') actions.push({ text: 'Schedule a short intervention cycle focused on recent low-performing topics.', priority: 'HIGH' });
  if (analytics.weakAreas.length > 0) actions.push({ text: 'Assign targeted practice for weak assessments and re-check in the next cycle.', priority: 'HIGH' });
  if (finalScore >= 75) actions.push({ text: 'Provide extension tasks to maintain growth momentum.', priority: 'LOW' });
  if (finalScore < PASS_THRESHOLD) actions.push({ text: 'Use scaffolded revision with weekly progress check-ins.', priority: 'MEDIUM' });
  if (actions.length === 0) actions.push({ text: 'Maintain current study plan and monitor progress against upcoming assessments.', priority: 'LOW' });
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'normal');
  for (const action of actions.slice(0, 4)) {
    ensureSpace(10);
    let tagColor: [number, number, number] = [156, 163, 175];
    if (action.priority === 'HIGH') tagColor = [220, 38, 38];
    if (action.priority === 'MEDIUM') tagColor = [217, 119, 6];
    const tagW = action.priority === 'MEDIUM' ? 16 : 12;
    doc.setFillColor(tagColor[0], tagColor[1], tagColor[2]);
    doc.roundedRect(margin + 2, y - 4, tagW, 5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(action.priority, margin + 2 + tagW / 2, y - 0.2, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    const actionText = action.priority === 'HIGH' ? `Immediate: ${action.text}` : action.text;
    doc.setFont('helvetica', action.priority === 'HIGH' ? 'bold' : 'normal');
    const actionHeight = drawWrappedText(doc, actionText, margin + tagW + 6, y, pageWidth - margin * 2 - tagW - 8, lineHeight);
    y += Math.max(8, actionHeight + 2);
  }

  ensureSpace(32);
  if (attendance && attendance.total > 0) {
      addSectionTitle(doc, t('attendanceOverview', lang), y, margin);
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.setFont("helvetica", "normal");
      doc.text(`${t('present', lang)}: ${attendance.present} / ${attendance.total}`, margin, y);
      doc.text(`${t('absent', lang)}: ${attendance.absent}`, margin + 60, y);
      doc.text(`${t('late', lang)}: ${attendance.late}`, margin + 100, y);
      const rateColor = attendance.rate >= 90 ? [22, 163, 74] : attendance.rate >= 80 ? [217, 119, 6] : [220, 38, 38];
      doc.setTextColor(rateColor[0], rateColor[1], rateColor[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${attendance.rate}%`, pageWidth - margin, y, { align: 'right' });
      y += 5;
      const barW = pageWidth - margin * 2;
      const barH = 4;
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(margin, y, barW, barH, 2, 2, 'F');
      doc.setFillColor(rateColor[0], rateColor[1], rateColor[2]);
      doc.roundedRect(margin, y, (Math.max(0, Math.min(100, attendance.rate)) / 100) * barW, barH, 2, 2, 'F');
      y += 12;
  } else {
      addSectionTitle(doc, t('attendanceOverview', lang), y, margin);
      y += 10;
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(107, 114, 128);
      y += drawWrappedText(doc, 'No data available', margin, y, pageWidth - margin * 2, lineHeight);
      y += sectionSpacing;
  }

  ensureSpace(32);
  addSectionTitle(doc, t('teacherComment', lang), y, margin);
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.setFont("helvetica", "italic");
  const finalComment = learner.comment?.trim()
    ? learner.comment
    : buildLearnerComment({
      weightedAverage: finalScore,
      trend,
      weakAreas: analytics.weakAreas
    });
  const commentText = await translateText(finalComment, lang);
  y += drawWrappedText(doc, commentText || 'No data available', margin, y, pageWidth - (margin * 2), lineHeight);

  const footerY = pageHeight - 40;
  doc.setDrawColor(200);
  doc.line(margin, footerY, margin + 60, footerY);
  doc.line(pageWidth - margin - 60, footerY, pageWidth - margin, footerY);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text(t('teacherSignature', lang), margin, footerY + 5);
  doc.text(t('parentSignature', lang), pageWidth - margin - 60, footerY + 5);
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('Generated by AdminLess Analytics Engine', pageWidth / 2, footerY + 12, { align: 'center' });
};

interface GenerateLearnerReportPDFParams {
  learner: Learner;
  classInfo: { subject: string; grade: string; className: string };
  gradingScheme: GradeSymbol[];
  schoolName?: string;
  teacherName?: string;
  schoolLogo?: string | null;
  contactEmail?: string;
  contactPhone?: string;
  attendance?: AttendanceStats;
  analytics?: LearnerReportAnalytics;
  lang?: string;
}

export const generateLearnerReportPDF = async ({
  learner,
  classInfo,
  gradingScheme,
  schoolName = "My School",
  teacherName = "",
  schoolLogo = null,
  contactEmail = "",
  contactPhone = "",
  attendance,
  analytics,
  lang = 'en'
}: GenerateLearnerReportPDFParams) => {
  const doc = new jsPDF();
  const profile: SchoolProfile = { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone };
  await addLearnerReportPage(doc, learner, classInfo, gradingScheme, profile, attendance, analytics, lang);
  addFooter(doc);
  doc.save(`${learner.name.replace(/\\s+/g, '_')}_Report.pdf`);
};

export const generateBulkLearnerReportsPDF = async (
  learners: Learner[],
  classInfo: { subject: string; grade: string; className: string },
  gradingScheme: GradeSymbol[],
  schoolName: string = "My School",
  teacherName: string = "",
  schoolLogo: string | null = null,
  contactEmail: string = "",
  contactPhone: string = "",
  attendanceMap?: Record<string, AttendanceStats>,
  analyticsMap?: Record<string, LearnerReportAnalytics>,
  lang: string = 'en'
) => {
  const doc = new jsPDF();
  const profile: SchoolProfile = { name: schoolName, teacher: teacherName, logo: schoolLogo, email: contactEmail, phone: contactPhone };

  for (let index = 0; index < learners.length; index++) {
    const learner = learners[index];
    if (index > 0) doc.addPage();
    const stats = learner.id && attendanceMap ? attendanceMap[learner.id] : undefined;
    const analytics = learner.id && analyticsMap ? analyticsMap[learner.id] : undefined;
    await addLearnerReportPage(doc, learner, classInfo, gradingScheme, profile, stats, analytics, lang);
  }

  addFooter(doc);
  doc.save(`${classInfo.className}_Term_Reports.pdf`);
};