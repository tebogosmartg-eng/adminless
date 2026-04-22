interface DailyStats {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

export const useDailyAttendance = () => {
  const stats: DailyStats = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    total: 0,
  };

  const loading = false;

  return { stats, loading };
};