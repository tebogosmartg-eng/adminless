import { useState, useCallback, useEffect } from 'react';
import { ScannedDetails, ScannedLearner, Learner } from '@/lib/types';
import { calculateSimilarity } from '@/utils/text';

export const useScanDataState = (existingLearners: Learner[]) => {
  const [scannedDetails, setScannedDetails] = useState<(ScannedDetails & { discoveredQuestions?: any[] }) | null>(null);
  const [scannedLearners, setScannedLearners] = useState<ScannedLearner[]>([]);
  const [learnerMappings, setLearnerMappings] = useState<Record<number, string>>({});

  const performAutoMatching = useCallback((scanned: ScannedLearner[], existing: Learner[]) => {
    const newMappings: Record<number, string> = {};
    const usedIds = new Set<string>();

    scanned.forEach((sl, idx) => {
        const sName = sl.name.toLowerCase().trim();
        let bestMatch = { id: "", score: 0 };

        existing.forEach(el => {
            if (!el.id || usedIds.has(el.id)) return;
            const eName = el.name.toLowerCase().trim();
            
            if (eName === sName) {
                bestMatch = { id: el.id, score: 1.0 };
                return;
            }
            if (eName.includes(sName) || sName.includes(eName)) {
                bestMatch = { id: el.id, score: 0.9 };
            }
            const sim = calculateSimilarity(sName, eName);
            if (sim > 0.75 && sim > bestMatch.score) {
                bestMatch = { id: el.id, score: sim };
            }
        });

        if (bestMatch.id) {
            newMappings[idx] = bestMatch.id;
            usedIds.add(bestMatch.id);
        }
    });

    setLearnerMappings(newMappings);
  }, []);

  useEffect(() => {
    if (scannedLearners.length > 0 && existingLearners.length > 0) {
        performAutoMatching(scannedLearners, existingLearners);
    }
  }, [scannedLearners, existingLearners, performAutoMatching]);

  const updateScannedDetail = (field: keyof ScannedDetails, value: string) => {
    if (scannedDetails) setScannedDetails({ ...scannedDetails, [field]: value });
  };

  const updateScannedLearner = (index: number, field: keyof ScannedLearner, value: any) => {
    const updated = [...scannedLearners];
    updated[index] = { ...updated[index], [field]: value };
    setScannedLearners(updated);
  };

  const updateLearnerMapping = (scannedIdx: number, learnerId: string) => {
      setLearnerMappings(prev => ({ ...prev, [scannedIdx]: learnerId }));
  };

  return {
    scannedDetails, setScannedDetails,
    scannedLearners, setScannedLearners,
    learnerMappings, setLearnerMappings,
    updateScannedDetail,
    updateScannedLearner,
    updateLearnerMapping
  };
};