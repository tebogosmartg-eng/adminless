import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { LessonLog } from "@/lib/types";
import { useAcademic } from "@/context/AcademicContext";

export const useClassLessonLogs = (classId: string) => {
  const { activeTerm } = useAcademic();

  const [logs, setLogs] = useState<LessonLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      if (!activeTerm?.id || !classId) {
        if (isMounted) {
          setLogs([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("lesson_logs")
        .select(`
          *,
          timetable!inner (
            class_id
          )
        `)
        .eq("timetable.class_id", classId)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching logs:", error);
        if (isMounted) setLoading(false);
        return;
      }

      if (isMounted) {
        setLogs((data as LessonLog[]) || []);
        setLoading(false);
      }
    };

    fetchLogs();

    return () => {
      isMounted = false;
    };
  }, [classId, activeTerm?.id]);

  return { logs, loading };
};