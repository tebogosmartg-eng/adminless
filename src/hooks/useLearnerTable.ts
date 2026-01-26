import { useState, useMemo } from 'react';
import { Learner } from '@/types';

type SortDirection = 'ascending' | 'descending';
type SortKey = keyof Learner;

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export const useLearnerTable = (learners: Learner[], atRiskThreshold: number) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const sortedAndFilteredLearners = useMemo(() => {
    const filtered = learners
      .map((learner, index) => ({ ...learner, originalIndex: index }))
      .filter(learner => {
        // Search Filter
        const matchesSearch = learner.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Status Filter
        let matchesStatus = true;
        const markNum = parseFloat(learner.mark);
        const hasMark = !isNaN(markNum);
        
        if (statusFilter === 'at-risk') {
          matchesStatus = hasMark && markNum < atRiskThreshold;
        } else if (statusFilter === 'passing') {
          matchesStatus = hasMark && markNum >= atRiskThreshold;
        } else if (statusFilter === 'missing') {
           matchesStatus = !hasMark || learner.mark === '';
        }

        return matchesSearch && matchesStatus;
      });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key!] || '';
        const bVal = b[sortConfig.key!] || '';
        let comparison = 0;

        if (sortConfig.key === 'mark') {
          const parseMark = (mark: string) => {
            if (!mark || mark.trim() === '') return -Infinity;
            const num = parseFloat(mark);
            return isNaN(num) ? -Infinity : num;
          };
          const numA = parseMark(aVal);
          const numB = parseMark(bVal);
          if (numA > numB) comparison = 1;
          else if (numA < numB) comparison = -1;
        } else { // name or comment
          if (aVal.toString().toLowerCase() > bVal.toString().toLowerCase()) comparison = 1;
          else if (aVal.toString().toLowerCase() < bVal.toString().toLowerCase()) comparison = -1;
        }
        return sortConfig.direction === 'descending' ? comparison * -1 : comparison;
      });
    }
    return filtered;
  }, [learners, sortConfig, searchQuery, statusFilter, atRiskThreshold]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIndices = sortedAndFilteredLearners.map(l => l.originalIndex);
      setSelectedIndices(allIndices);
    } else {
      setSelectedIndices([]);
    }
  };

  const handleSelectOne = (index: number, checked: boolean) => {
    if (checked) {
      setSelectedIndices(prev => [...prev, index]);
    } else {
      setSelectedIndices(prev => prev.filter(i => i !== index));
    }
  };

  const clearSelection = () => setSelectedIndices([]);

  return {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    sortConfig, requestSort,
    selectedIndices, setSelectedIndices,
    sortedAndFilteredLearners,
    handleSelectAll,
    handleSelectOne,
    clearSelection
  };
};