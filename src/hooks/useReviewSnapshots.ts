"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ReviewSnapshot } from "@/lib/types";
import { showSuccess, showError } from "@/utils/toast";

export const useReviewSnapshots = (classId: string, termId: string) => {
  const [snapshots, setSnapshots] = useState<ReviewSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 FETCH SNAPSHOTS
  useEffect(() => {
    const fetchSnapshots = async () => {
      if (!classId || !termId) return;

      setLoading(true);

      const { data, error } = await supabase
        .from("review_snapshots")
        .select("*")
        .eq("class_id", classId)
        .eq("term_id", termId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        showError("Failed to load snapshots");
      } else {
        setSnapshots(data || []);
      }

      setLoading(false);
    };

    fetchSnapshots();
  }, [classId, termId]);

  // 🔥 CREATE SNAPSHOT
  const createSnapshot = async (
    name: string,
    entryIds: string[],
    rules: any
  ) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) throw new Error("No session");

      const newSnapshot = {
        user_id: user.id,
        class_id: classId,
        term_id: termId,
        name,
        rules,
        entry_ids: entryIds,
      };

      const { data, error } = await supabase
        .from("review_snapshots")
        .insert([newSnapshot])
        .select()
        .single();

      if (error) throw error;

      setSnapshots(prev => [data, ...prev]);

      showSuccess(`Snapshot "${name}" saved.`);
    } catch (e: any) {
      console.error(e);
      showError(e.message || "Failed to save snapshot.");
    }
  };

  // 🔥 DELETE SNAPSHOT
  const deleteSnapshot = async (id: string) => {
    try {
      const { error } = await supabase
        .from("review_snapshots")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSnapshots(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      console.error(e);
      showError("Failed to delete snapshot");
    }
  };

  return {
    snapshots,
    loading,
    createSnapshot,
    deleteSnapshot,
  };
};