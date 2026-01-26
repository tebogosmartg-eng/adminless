import { useState } from 'react';
import { ClassInfo, Learner, ClassInsight } from '@/lib/types';
import { generateClassInsights, generateReportComments, getMockClassInsights, getMockReportComments } from '@/services/gemini';
import { showSuccess, showError } from '@/utils/toast';

export const useAiFeatures = (
  classInfo: ClassInfo | undefined,
  learners: Learner[],
  setLearners: React.Dispatch<React.SetStateAction<Learner[]>>
) => {
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState<ClassInsight | null>(null);
  
  const [showComments, setShowComments] = useState(false);
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);

  const clearInsights = () => setInsights(null);

  const handleGenerateInsights = async () => {
    if (!classInfo) return;
    if (!learners.some(l => l.mark && l.mark.trim() !== "")) {
      showError("Please enter some marks before generating insights.");
      return;
    }
    setIsGeneratingInsights(true);
    try {
      const result = await generateClassInsights(classInfo.subject, classInfo.grade, learners);
      setInsights(result);
    } catch (error) {
      console.error(error);
      showError("Failed to generate insights.");
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleSimulateInsights = () => {
    setIsGeneratingInsights(true);
    setTimeout(() => {
      setInsights(getMockClassInsights());
      setIsGeneratingInsights(false);
      showSuccess("Demo insights generated successfully!");
    }, 1000);
  };

  const handleGenerateComments = async () => {
    if (!classInfo) return;
    if (!learners.some(l => l.mark && l.mark.trim() !== "")) {
      showError("Enter marks before generating comments.");
      return;
    }
    setIsGeneratingComments(true);
    setShowComments(true);
    try {
      const comments = await generateReportComments(classInfo.subject, classInfo.grade, learners);
      const updated = learners.map(l => {
        const gen = comments.find(c => c.name === l.name);
        return gen ? { ...l, comment: gen.comment } : l;
      });
      setLearners(updated);
      showSuccess(`Generated comments for ${comments.length} learners.`);
    } catch (error) {
      console.error(error);
      showError("Failed to generate comments.");
    } finally {
      setIsGeneratingComments(false);
    }
  };

  const handleSimulateComments = () => {
     setIsGeneratingComments(true);
     setShowComments(true);
     setTimeout(() => {
        const mockComments = getMockReportComments(learners);
        const updatedLearners = learners.map(learner => {
          const generated = mockComments.find(c => c.name === learner.name);
          return generated ? { ...learner, comment: generated.comment } : learner;
        });
        setLearners(updatedLearners);
        setIsGeneratingComments(false);
        showSuccess("Demo comments generated!");
     }, 1000);
  };

  return {
    isGeneratingInsights,
    insights,
    setInsights,
    clearInsights,
    handleGenerateInsights,
    handleSimulateInsights,
    showComments,
    setShowComments,
    isGeneratingComments,
    handleGenerateComments,
    handleSimulateComments
  };
};