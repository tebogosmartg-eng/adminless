"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SafeInput } from "@/components/safe-form/SafeInput";
import { SafeSelect } from "@/components/safe-form/SafeSelect";
import { useSafeForm } from "@/hooks/useSafeForm";

import { useSettings } from "@/context/SettingsContext";
import { useAcademic } from "@/context/AcademicContext";

import {
  Plus,
  Trash2,
  ListChecks
} from "lucide-react";

import { showSuccess, showError } from "@/utils/toast";
import { useAsyncState } from "@/hooks/useAsyncState";
import { AsyncStatus } from "@/components/ui/AsyncStatus";
import { Skeleton } from "@/components/ui/skeleton";

export const CurriculumSettings = () => {
  const { savedSubjects, savedGrades } = useSettings();
  const { activeTerm } = useAcademic();

  const form = useSafeForm({
    initialValues: {
      subject: "",
      grade: "",
      newTopic: "",
    },
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const topicState = useAsyncState();
  const selectedSubject = form.values.subject ?? "";
  const selectedGrade = form.values.grade ?? "";
  const activeTermId = activeTerm?.id ?? "";
  const validationRules = {
    subject: [{ type: "required" as const, message: "Subject is required." }],
    grade: [{ type: "required" as const, message: "Grade is required." }],
    newTopic: [{ type: "required" as const, message: "Topic title is required." }],
  };

  // 🔥 FETCH TOPICS
  useEffect(() => {
    const fetchTopics = async () => {
      if (!selectedSubject || !selectedGrade || !activeTermId) {
        setTopics([]);
        return;
      }

      setLoading(true);
      try {
        await topicState.run(
          async () => {
            const { data, error } = await supabase
              .from("curriculum_topics")
              .select("*")
              .eq("subject", selectedSubject)
              .eq("grade", selectedGrade)
              .eq("term_id", activeTermId)
              .order("order", { ascending: true });
            if (error) throw error;
            setTopics(data || []);
          },
          { status: "loading" },
        );
      } catch (error) {
        console.error(error);
        showError("Failed to load topics");
        setTopics([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchTopics();
  }, [activeTermId, selectedGrade, selectedSubject]);

  // 🔥 ADD TOPIC
  const handleAddTopic = async () => {
    const subject = form.values.subject;
    const grade = form.values.grade;
    const newTopic = form.values.newTopic;
    setTouched((prev) => ({ ...prev, subject: true, grade: true, newTopic: true }));
    const subjectValid = await form.validateField("subject", validationRules.subject);
    const gradeValid = await form.validateField("grade", validationRules.grade);
    const topicValid = await form.validateField("newTopic", validationRules.newTopic, newTopic.trim());
    if (!subjectValid || !gradeValid || !topicValid || !activeTerm || !subject || !grade) return;

    try {
      await topicState.run(async () => {
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
        form.setFieldValue("newTopic", "", validationRules.newTopic);
        setTouched((prev) => ({ ...prev, newTopic: false }));
      }, { status: "saving" });
      showSuccess("Topic added to term plan.");
    } catch (e: any) {
      console.error(e);
      showError("Failed to add topic");
    }
  };

  // 🔥 DELETE
  const handleDelete = async (id: string) => {
    try {
      await topicState.run(async () => {
        const { error } = await supabase
          .from("curriculum_topics")
          .delete()
          .eq("id", id);

        if (error) throw error;

        setTopics(prev => prev.filter(t => t.id !== id));
      }, { status: "saving" });
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
        <AsyncStatus state={{ status: topicState.status, error: topicState.error, retry: topicState.retry }} />

        {/* SELECTORS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold">Subject</Label>
            <SafeSelect
              form={form}
              name="subject"
              rules={validationRules.subject}
              error={touched.subject ? form.errors.subject : undefined}
              placeholder="Choose Subject"
              options={savedSubjects.map((s) => ({ value: s, label: s }))}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, subject: true }));
                void form.validateField("subject", validationRules.subject);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold">Grade</Label>
            <SafeSelect
              form={form}
              name="grade"
              rules={validationRules.grade}
              error={touched.grade ? form.errors.grade : undefined}
              placeholder="Choose Grade"
              options={savedGrades.map((g) => ({ value: g, label: g }))}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, grade: true }));
                void form.validateField("grade", validationRules.grade);
              }}
            />
          </div>

        </div>

        {/* TOPICS */}
        {form.values.subject && form.values.grade && (
          <div className="space-y-4">

            <div className="flex gap-2">
              <SafeInput
                form={form}
                name="newTopic"
                rules={validationRules.newTopic}
                error={touched.newTopic ? form.errors.newTopic : undefined}
                placeholder="Add topic..."
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, newTopic: true }));
                  void form.validateField("newTopic", validationRules.newTopic);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
              />

              <Button onClick={handleAddTopic}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="border rounded-lg bg-muted/20 overflow-hidden">

              {loading ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
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