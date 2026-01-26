import { GradeSymbol } from "@/lib/types";

export const defaultGradingScheme: GradeSymbol[] = [
  { id: '1', min: 80, max: 100, symbol: 'A', level: 7, color: 'text-green-700', badgeColor: 'bg-green-100 text-green-700 hover:bg-green-100/80' },
  { id: '2', min: 70, max: 79.99, symbol: 'B', level: 6, color: 'text-green-600', badgeColor: 'bg-green-50 text-green-600 hover:bg-green-50/80' },
  { id: '3', min: 60, max: 69.99, symbol: 'C', level: 5, color: 'text-blue-600', badgeColor: 'bg-blue-100 text-blue-600 hover:bg-blue-100/80' },
  { id: '4', min: 50, max: 59.99, symbol: 'D', level: 4, color: 'text-yellow-600', badgeColor: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80' },
  { id: '5', min: 40, max: 49.99, symbol: 'E', level: 3, color: 'text-orange-600', badgeColor: 'bg-orange-100 text-orange-700 hover:bg-orange-100/80' },
  { id: '6', min: 30, max: 39.99, symbol: 'F', level: 2, color: 'text-red-600', badgeColor: 'bg-red-100 text-red-700 hover:bg-red-100/80' },
  { id: '7', min: 0, max: 29.99, symbol: 'FF', level: 1, color: 'text-red-700', badgeColor: 'bg-red-200 text-red-800 hover:bg-red-200/80' },
];

export const getGradeSymbol = (mark: string | number, scheme: GradeSymbol[] = defaultGradingScheme): GradeSymbol | null => {
  if (mark === '' || mark === undefined || mark === null) return null;
  
  const numMark = typeof mark === 'string' ? parseFloat(mark) : mark;
  
  if (isNaN(numMark)) return null;

  // Sort scheme by min value descending to check higher ranges first
  return scheme.find(g => numMark >= g.min && numMark <= g.max) || null;
};