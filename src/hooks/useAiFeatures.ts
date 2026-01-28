import { useState } from 'react';
import { generateLearnerReport, generateClassInsights, generateBulkComments } from '@/services/gemini';
import { useToast } from '@/components/ui/use-toast';
import { Learner, ClassInfo, ClassInsight } from '@/lib/types';
import { db } from '@/db';

export const useAiFeatures = (
  classInfo: ClassInfo,
  learners: Learner[],
  setLearners?: React.Dispatch<React.SetStateAction<Learner[]>>
) => {
  const [loading, setLoading] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState<ClassInsight | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async (
    learner: Learner, 
    cls: ClassInfo, 
    assessmentData: any
  ): Promise<string> => {
    if (!navigator.onLine) {
        toast({
            title: "Offline",
            description: "AI report generation requires an active internet connection.",
            variant: "destructive"
        });
        return "Offline: Cannot generate report.";
    }

    setLoading(true);
    try {
      const report = await generateLearnerReport(learner, cls, assessmentData);
      return report;
    } catch (error) {
      console.error(error);
      toast({
        title: "Generation Failed",
        description: "Could not generate report.",
        variant: "destructive",
      });
      return "Error generating report.";
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!navigator.onLine) {
        toast({ title: "Offline", description: "Insights unavailable offline.", variant: "destructive" });
        return;
    }

    setIsGeneratingInsights(true);
    try {
      const assessments = await db.assessments.where('class_id').equals(classInfo.id).toArray();
      const assessmentIds = assessments.map(a => a.id);
      const marks = await db.assessment_marks.where('assessment_id').anyOf(assessmentIds).toArray();
      
      const assessmentData = { assessments, marks };

      const result = await generateClassInsights(classInfo, learners, assessmentData);
      setInsights(result);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to generate insights.", variant: "destructive" });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleSimulateInsights = () => {
    setInsights({
      summary: "This is a simulated AI insight generated for demonstration purposes.",
      strengths: ["High attendance rates", "Strong performance in practicals"],
      areasForImprovement: ["Theoretical concepts", "Homework submission"],
      recommendations: ["Schedule extra workshop sessions", "Review basic concepts"]
    });
  };

  const handleGenerateComments = async (tone: string = "Professional") => {
    if (!setLearners) return;
    if (!navigator.onLine) {
        toast({ title: "Offline", description: "Cannot generate comments offline.", variant: "destructive" });
        return;
    }

    setIsGeneratingComments(true);
    try {
      const comments = await generateBulkComments(learners, tone);
      
      // Map back to learners (handling potential AI response mismatch by name map or index if reliable, name is safer)
      const commentMap = new Map(comments.map(c => [c.name, c.comment]));
      
      const updatedLearners = learners.map(l => ({
          ...l,
          comment: commentMap.get(l.name) || l.comment || ""
      }));

      setLearners(updatedLearners);
      toast({ title: "Comments Generated", description: `Generated comments for ${updatedLearners.length} learners.` });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to generate comments.", variant: "destructive" });
    } finally {
      setIsGeneratingComments(false);
    }
  };

  return {
    loading,
    isGeneratingInsights,
    insights,
    showComments,
    setShowComments,
    isGeneratingComments,
    handleGenerateReport,
    handleGenerateInsights,
    handleSimulateInsights,
    handleGenerateComments
  };
};