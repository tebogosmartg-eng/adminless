"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";

import { useSettings } from "@/context/SettingsContext";
import { useAcademic } from "@/context/AcademicContext";

import {
  Plus,
  Trash2,
  ListChecks
} from "lucide-react";

import { showSuccess, showError } from "@/utils/toast";

export const CurriculumSettings = () => {
  const { savedSubjects, savedGrades } = useSettings();
  const { activeTerm } = useAcademic();

  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [newTopic, setNewTopic] = useState("");

  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔥 FETCH TOPICS
  useEffect(() => {
    const fetchTopics = async () => {
      if (!subject || !grade || !activeTerm) {
        setTopics([]);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("curriculum_topics")
        .select("*")
        .eq("subject", subject)
        .eq("grade", grade)
        .eq("term_id", activeTerm.id)
        .order("order", { ascending: true });

      if (error) {
        console.error(error);
        showError("Failed to load topics");
        setTopics([]);
      } else {
        setTopics(data || []);
      }

      setLoading(false);
    };

    fetchTopics();
  }, [subject, grade, activeTerm?.id]);

  // 🔥 ADD TOPIC
  const handleAddTopic = async () => {
    if (!newTopic.trim() || !activeTerm || !subject || !grade) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (!user) throw new Error("No user");

      const payload = {
        user_id: user.id,
        subject,
        grade,
        term_id: activeTerm.id,
        title: newTopic.trim(),
        order: topics.length + 1
      };

      const { data, error } = await supabase
        .from("curriculum_topics")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setTopics(prev => [...prev, data]);
      setNewTopic("");

      showSuccess("Topic added to term plan.");
    } catch (e: any) {
      console.error(e);
      showError("Failed to add topic");
    }
  };

  // 🔥 DELETE
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("curriculum_topics")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTopics(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
      showError("Delete failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" />
          <CardTitle>Curriculum Planner</CardTitle>
        </div>

        <CardDescription>
          Define the topics you intend to cover for each subject this term.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* SELECTORS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold">Subject</Label>

            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Choose Subject" />
              </SelectTrigger>

              <SelectContent>
                {savedSubjects.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold">Grade</Label>

            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger>
                <SelectValue placeholder="Choose Grade" />
              </SelectTrigger>

              <SelectContent>
                {savedGrades.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>

        {/* TOPICS */}
        {subject && grade && (
          <div className="space-y-4">

            <div className="flex gap-2">
              <Input
                placeholder="Add topic..."
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
              />

              <Button onClick={handleAddTopic}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="border rounded-lg bg-muted/20 overflow-hidden">

              {loading ? (
                <div className="p-6 text-center text-xs">
                  Loading topics...
                </div>
              ) : topics.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No topics yet.
                </div>
              ) : (
                <div className="divide-y">
                  {topics.map((t, i) => (
                    <div
                      key={t.id}
                      className="flex justify-between p-3"
                    >
                      <span className="text-sm">
                        {i + 1}. {t.title}
                      </span>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

            </div>

          </div>
        )}

      </CardContent>
    </Card>
  );
};