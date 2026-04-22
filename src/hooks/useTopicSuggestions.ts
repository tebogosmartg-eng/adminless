"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { normalizeTopic } from "@/utils/topic";

export const useTopicSuggestions = (subject?: string, grade?: string) => {
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchTopics = async () => {
      setLoading(true);

      try {
        const suggestions = new Set<string>();

        // 🔥 1. Curriculum topics
        let curriculumQuery = supabase
          .from("curriculum_topics")
          .select("title, subject, grade");

        if (subject) curriculumQuery = curriculumQuery.eq("subject", subject);
        if (grade) curriculumQuery = curriculumQuery.eq("grade", grade);

        const { data: curriculumData } = await curriculumQuery;

        curriculumData?.forEach((t: any) => {
          if (t.title) {
            suggestions.add(normalizeTopic(t.title));
          }
        });

        // 🔥 2. Get classes (for filtering assessments)
        let classQuery = supabase
          .from("classes")
          .select("id, subject, grade");

        if (subject) classQuery = classQuery.eq("subject", subject);
        if (grade) classQuery = classQuery.eq("grade", grade);

        const { data: classes } = await classQuery;

        const classIds = classes?.map(c => c.id) || [];

        if (classIds.length > 0) {
          // 🔥 3. Assessments with questions
          const { data: assessments } = await supabase
            .from("assessments")
            .select("questions, class_id")
            .in("class_id", Array.isArray(classIds) ? classIds : [classIds]);

          assessments?.forEach((a: any) => {
            a.questions?.forEach((q: any) => {
              if (q.topic) {
                suggestions.add(normalizeTopic(q.topic));
              }
            });
          });
        }

        if (isMounted) {
          setTopics(Array.from(suggestions).sort());
        }
      } catch (error) {
        console.error("Error fetching topic suggestions:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTopics();

    return () => {
      isMounted = false;
    };
  }, [subject, grade]);

  return topics;
};