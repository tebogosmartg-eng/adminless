export const parseMarkInput = (input: string): { value: string; isCalculated: boolean; raw?: string } => {
  if (!input) return { value: "", isCalculated: false };

  // Check for "x/y" pattern (e.g. 15/20)
  // Allows optional spaces around the slash
  const fractionMatch = input.match(/^(\d+(\.\d+)?)\s*\/\s*(\d+(\.\d+)?)$/);
  
  if (fractionMatch) {
    const num = parseFloat(fractionMatch[1]);
    const den = parseFloat(fractionMatch[3]);
    
    if (den !== 0) {
      // Calculate percentage, max 1 decimal place, remove trailing .0
      const percentage = ((num / den) * 100).toFixed(1).replace(/\.0$/, '');
      return { value: percentage, isCalculated: true, raw: input };
    }
  }
  
  return { value: input, isCalculated: false };
};