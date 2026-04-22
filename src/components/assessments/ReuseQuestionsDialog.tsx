"use client";

import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";

import {
  Search, Library, ArrowRight,
  ChevronLeft, LayoutList, CheckSquare
} from "lucide-react";

import { cn } from "@/lib/utils";
import { showError } from "@/utils/toast";

interface ReuseQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (questions: any[], mode: "append" | "replace") => void;
  existingQuestionsCount?: number;
}

export const ReuseQuestionsDialog = ({
  open,
  onOpenChange,
  onImport,
  existingQuestionsCount = 0
}: ReuseQuestionsDialogProps) => {

  const [step, setStep] = useState<"select_assessment" | "select_questions">("select_assessment");
  const [search, setSearch] = useState("");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [importMode, setImportMode] = useState<"append" | "replace">("append");

  const [assessments, setAssessments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 LOAD FROM SUPABASE
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [assRes, classRes] = await Promise.all([
        supabase.from("assessments").select("*"),
        supabase.from("classes").select("*")
      ]);

      if (assRes.error) console.error(assRes.error);
      if (classRes.error) console.error(classRes.error);

      setAssessments(assRes.data || []);
      setClasses(classRes.data || []);
      setLoading(false);
    };

    if (open) load();
  }, [open]);

  const classMap = useMemo(() => {
    const map = new Map();
    classes.forEach(c => map.set(c.id, c));
    return map;
  }, [classes]);

  const bankAssessments = useMemo(() => {
    return assessments
      .filter(a => a.questions?.length > 0)
      .map(a => {
        const cls = classMap.get(a.class_id);
        return {
          ...a,
          subject: cls?.subject || "Unknown",
          grade: cls?.grade || "Unknown",
          className: cls?.className || "Unknown"
        };
      });
  }, [assessments, classMap]);

  const filteredAssessments = useMemo(() => {
    if (!search) return bankAssessments;

    const s = search.toLowerCase();
    return bankAssessments.filter(a =>
      a.title?.toLowerCase().includes(s) ||
      a.subject?.toLowerCase().includes(s) ||
      a.grade?.toLowerCase().includes(s)
    );
  }, [bankAssessments, search]);

  const selectedAssessment = useMemo(() => {
    return bankAssessments.find(a => a.id === selectedAssessmentId) || null;
  }, [bankAssessments, selectedAssessmentId]);

  useEffect(() => {
    if (open) {
      setStep("select_assessment");
      setSearch("");
      setSelectedAssessmentId(null);
      setSelectedQuestionIds(new Set());
      setImportMode("append");
    }
  }, [open]);

  useEffect(() => {
    if (step === "select_questions" && selectedAssessment?.questions) {
      setSelectedQuestionIds(
        new Set(selectedAssessment.questions.map((q: any) => q.id))
      );
    }
  }, [step, selectedAssessment]);

  const toggleQuestion = (id: string) => {
    const next = new Set(selectedQuestionIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedQuestionIds(next);
  };

  const toggleAll = () => {
    if (!selectedAssessment?.questions) return;

    if (selectedQuestionIds.size === selectedAssessment.questions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(
        new Set(selectedAssessment.questions.map((q: any) => q.id))
      );
    }
  };

  const handleImport = () => {
    if (!selectedAssessment?.questions || selectedQuestionIds.size === 0) {
      showError("Select at least one question");
      return;
    }

    const questions = selectedAssessment.questions
      .filter((q: any) => selectedQuestionIds.has(q.id))
      .map((q: any) => ({
        ...q,
        id: crypto.randomUUID()
      }));

    onImport(questions, importMode);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">

        {/* HEADER */}
        <div className="p-6 border-b">
          <DialogHeader>
            <DialogTitle className="flex gap-2 items-center">
              <Library className="h-5 w-5" /> Question Bank
            </DialogTitle>
            <DialogDescription>
              {step === "select_assessment"
                ? "Select assessment"
                : "Select questions"}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* STEP 1 */}
        {step === "select_assessment" && (
          <>
            <div className="p-4 border-b">
              <Input
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <ScrollArea className="flex-1 p-4">
              {loading ? (
                <div className="text-center">Loading...</div>
              ) : filteredAssessments.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAssessmentId(a.id)}
                  className={cn(
                    "w-full p-4 border rounded mb-2 text-left",
                    selectedAssessmentId === a.id && "border-primary"
                  )}
                >
                  <div className="font-bold">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.subject} • {a.grade}
                  </div>
                </button>
              ))}
            </ScrollArea>

            <div className="p-4 border-t flex justify-end">
              <Button
                disabled={!selectedAssessmentId}
                onClick={() => setStep("select_questions")}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* STEP 2 */}
        {step === "select_questions" && (
          <>
            <div className="p-4 border-b flex justify-between">
              <Button variant="outline" onClick={() => setStep("select_assessment")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>

              <Select value={importMode} onValueChange={(v: any) => setImportMode(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="append">Append</SelectItem>
                  <SelectItem value="replace">Replace</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="flex-1 p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Checkbox
                        checked={
                          selectedAssessment?.questions &&
                          selectedQuestionIds.size === selectedAssessment.questions.length
                        }
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Marks</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {selectedAssessment?.questions?.map((q: any) => (
                    <TableRow key={q.id} onClick={() => toggleQuestion(q.id)}>
                      <TableCell>
                        <Checkbox checked={selectedQuestionIds.has(q.id)} />
                      </TableCell>
                      <TableCell>{q.skill_description}</TableCell>
                      <TableCell>
                        <Badge>{q.topic || "-"}</Badge>
                      </TableCell>
                      <TableCell>{q.max_mark}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>

              <Button onClick={handleImport}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
};