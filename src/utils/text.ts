/**
 * Calculates Levenshtein distance based similarity between two strings.
 * Returns a value between 0.0 (no match) and 1.0 (exact match).
 */
export const calculateSimilarity = (s1: string, s2: string): number => {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  
  const editDistance = (a: string, b: string) => {
    const costs = [];
    for (let i = 0; i <= a.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= b.length; j++) {
        if (i === 0) costs[j] = j;
        else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (a.charAt(i - 1) !== b.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[b.length] = lastValue;
    }
    return costs[b.length];
  };

  return (longerLength - editDistance(longer, shorter)) / longerLength;
};