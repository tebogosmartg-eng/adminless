import { Learner } from "@/types";

export const calculateClassStats = (learners: Learner[]) => {
  const marks = learners
    .map(l => parseFloat(l.mark))
    .filter(m => !isNaN(m) && m >= 0);

  if (marks.length === 0) {
    return {
      average: 0,
      passRate: 0,
      highestMark: 0,
      lowestMark: 0,
      totalLearners: learners.length,
      learnersWithMarks: 0,
    };
  }

  const sum = marks.reduce((acc, mark) => acc + mark, 0);
  const average = parseFloat((sum / marks.length).toFixed(2));
  const passes = marks.filter(m => m >= 50).length;
  const passRate = Math.round((passes / marks.length) * 100);
  const highestMark = Math.max(...marks);
  const lowestMark = Math.min(...marks);

  return {
    average,
    passRate,
    highestMark,
    lowestMark,
    totalLearners: learners.length,
    learnersWithMarks: marks.length,
  };
};