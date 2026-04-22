export const useLessonLogs = (timetableId?: string, date?: string) => {
  const log = null;
  void timetableId;
  void date;

  // 🔥 Safe no-op during migration
  const saveLog = async (
    content: string,
    homework?: string,
    topic_ids: string[] = []
  ) => {
    void content;
    void homework;
    void topic_ids;
  };

  return { log, saveLog };
};