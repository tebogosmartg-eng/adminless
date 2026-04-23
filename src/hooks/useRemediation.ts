"use client";

import { useState, useEffect } from "react";
import { RemediationTask } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import { showSuccess, showError } from "@/utils/toast";

export const useRemediation = (classId?: string, termId?: string) => {
  const [tasks, setTasks] = useState<RemediationTask[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 FETCH TASKS
  useEffect(() => {
    let isMounted = true;

    const fetchTasks = async () => {
      if (!classId || !termId) {
        if (isMounted) {
          setTasks([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("remediation_tasks")
        .select("*")
        .eq("class_id", classId)
        .eq("term_id", termId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch tasks error:", error);
        if (isMounted) setLoading(false);
        return;
      }

      if (isMounted) {
        setTasks(data || []);
        setLoading(false);
      }
    };

    fetchTasks();

    return () => {
      isMounted = false;
    };
  }, [classId, termId]);

  // 🔥 CREATE TASKS
  const activateInterventions = async (
    assessmentId: string,
    interventions: { title: string; description: string }[]
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !classId || !termId) return;

    try {
      const payload = interventions.map(i => ({
        user_id: user.id,
        class_id: classId,
        term_id: termId,
        assessment_id: assessmentId,
        title: i.title,
        description: i.description,
        status: "pending",
      }));

      const { data, error } = await supabase
        .from("remediation_tasks")
        .insert(payload)
        .select();

      if (error) throw error;

      setTasks(prev => [...(data || []), ...prev]);

      showSuccess(
        `Activated ${payload.length} interventions in the action plan.`
      );
    } catch (e) {
      console.error(e);
      showError("Failed to activate interventions.");
    }
  };

  // 🔥 UPDATE STATUS
  const updateTaskStatus = async (
    id: string,
    status: RemediationTask["status"]
  ) => {
    try {
      const { data, error } = await supabase
        .from("remediation_tasks")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, status: data.status } : t))
      );
    } catch (e) {
      console.error(e);
      showError("Failed to update task.");
    }
  };

  // 🔥 DELETE TASK
  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from("remediation_tasks")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
      showError("Failed to delete task.");
    }
  };

  return { tasks, loading, activateInterventions, updateTaskStatus, deleteTask };
};