import { useState, useMemo } from 'react';
import { ClassInfo } from '@/components/CreateClassDialog';
import { calculateClassStats } from '@/utils/stats';
import { showSuccess, showError } from '@/utils/toast';

export interface AggregatedLearner {
  name: string;
  marks: { [classId: string]: number | null };
  finalMark: number;
}

export const useReportsData = (classes: ClassInfo[]) => {
  // Selection Filters
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  
  // Assessment Selection & Weighting
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [weights, setWeights] = useState<{ [classId: string]: string }>({});
  
  // Results
  const [aggregatedData, setAggregatedData] = useState<AggregatedLearner[] | null>(null);

  // Filter Logic
  const uniqueGrades = useMemo(() => Array.from(new Set(classes.map(c => c.grade))).sort(), [classes]);
  const uniqueSubjects = useMemo(() => Array.from(new Set(classes.map(c => c.subject))).sort(), [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter(c => 
      !c.archived && 
      (selectedGrade === "all" || c.grade === selectedGrade) && 
      (selectedSubject === "all" || c.subject === selectedSubject)
    );
  }, [classes, selectedGrade, selectedSubject]);

  const handleClassToggle = (classId: string, checked: boolean) => {
    if (checked) {
      setSelectedClassIds(prev => [...prev, classId]);
      setWeights(prev => ({ ...prev, [classId]: "10" })); 
    } else {
      setSelectedClassIds(prev => prev.filter(id => id !== classId));
      const newWeights = { ...weights };
      delete newWeights[classId];
      setWeights(newWeights);
    }
  };

  const handleWeightChange = (classId: string, value: string) => {
    setWeights(prev => ({ ...prev, [classId]: value }));
  };

  const calculateResults = () => {
    if (selectedClassIds.length === 0) {
      showError("Please select at least one assessment.");
      return;
    }

    const parsedWeights: { [id: string]: number } = {};
    let totalWeight = 0;
    
    selectedClassIds.forEach(id => {
      const w = parseFloat(weights[id]);
      if (isNaN(w) || w < 0) {
        parsedWeights[id] = 0;
      } else {
        parsedWeights[id] = w;
        totalWeight += w;
      }
    });

    if (totalWeight === 0) {
      showError("Total weight must be greater than 0.");
      return;
    }

    const learnerMap: { [name: string]: AggregatedLearner } = {};

    selectedClassIds.forEach(classId => {
      const cls = classes.find(c => c.id === classId);
      if (!cls) return;

      cls.learners.forEach(l => {
        const normalizedName = l.name.trim();
        if (!learnerMap[normalizedName]) {
          learnerMap[normalizedName] = {
            name: normalizedName,
            marks: {},
            finalMark: 0
          };
        }
        const markVal = parseFloat(l.mark);
        learnerMap[normalizedName].marks[classId] = !isNaN(markVal) ? markVal : null;
      });
    });

    const results = Object.values(learnerMap).map(learner => {
      let weightedSum = 0;
      selectedClassIds.forEach(classId => {
        const mark = learner.marks[classId];
        const weight = parsedWeights[classId];
        if (mark !== null) {
          weightedSum += mark * weight;
        }
      });
      
      const final = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
      return { ...learner, finalMark: parseFloat(final.toFixed(1)) };
    }).sort((a, b) => a.name.localeCompare(b.name));

    setAggregatedData(results);
    showSuccess(`Calculated results for ${results.length} learners.`);
  };

  const trendData = useMemo(() => {
    if (selectedClassIds.length === 0) return [];

    const sortedAssessments = selectedClassIds
      .map(id => classes.find(c => c.id === id)!)
      .sort((a, b) => a.id.localeCompare(b.id));

    return sortedAssessments.map(c => {
      const stats = calculateClassStats(c.learners);
      return {
        name: c.className,
        average: stats.average,
        passRate: stats.passRate
      };
    });
  }, [selectedClassIds, classes]);

  return {
    selectedGrade, setSelectedGrade,
    selectedSubject, setSelectedSubject,
    uniqueGrades, uniqueSubjects,
    filteredClasses,
    selectedClassIds,
    weights,
    handleClassToggle,
    handleWeightChange,
    calculateResults,
    aggregatedData,
    setAggregatedData,
    trendData
  };
};