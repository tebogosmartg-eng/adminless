"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  Plus,
  Trash2,
  FileText,
  ChevronLeft,
  Search,
  AlertCircle
} from "lucide-react";

import { RubricBuilder } from "@/components/assessments/RubricBuilder";
import { showSuccess, showError } from "@/utils/toast";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const RubricLibrary = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rubricToDelete, setRubricToDelete] = useState<{ id: string; title: string } | null>(null);

  // 🔥 FETCH FROM SUPABASE
  useEffect(() => {
    const fetchRubrics = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("rubrics")
        .select("*");

      if (error) {
        console.error(error);
        showError("Failed to load rubrics");
        setErrorMessage("Failed to load rubrics. Please refresh and try again.");
      } else {
        setRubrics(data || []);
      }

      setLoading(false);
    };

    fetchRubrics();
  }, []);

  // 🔍 FILTER
  const filteredRubrics = useMemo(() => {
    return rubrics.filter(r =>
      r.title?.toLowerCase().includes(search.toLowerCase())
    );
  }, [rubrics, search]);

  // 🔥 DELETE
  const handleDelete = async (id: string, title: string) => {
    const { error } = await supabase
      .from("rubrics")
      .delete()
      .eq("id", id);

    if (error) {
      showError("Delete failed");
      setErrorMessage("Delete failed. Please try again.");
      return;
    }

    setRubrics(prev => prev.filter(r => r.id !== id));
    showSuccess("Rubric removed");
    setStatusMessage(`Saved ✓ "${title}" removed.`);
    setRubricToDelete(null);
  };

  if (isCreating) {
    return (
      <div className="space-y-4 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCreating(false)}
          className="gap-2 w-full sm:w-auto"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Library
        </Button>

        <RubricBuilder onSave={() => setIsCreating(false)} />
      </div>
    );
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <CardTitle>Rubric Library</CardTitle>
          </div>

          <Button onClick={() => setIsCreating(true)} size="sm" className="w-full sm:w-auto h-10 sm:h-9">
            <Plus className="h-4 w-4 mr-1" /> New Rubric
          </Button>
        </div>

        <CardDescription>
          Design marking grids for projects and assessments.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 min-w-0">
        {statusMessage && (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{statusMessage}</AlertDescription>
          </Alert>
        )}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <section className="space-y-2">
          <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Search</p>
          <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rubrics..."
            className="pl-9 h-10 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          </div>
        </section>

        {/* Loading */}
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : rubrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
            <FileText className="h-10 w-10 opacity-20 mb-3" />
            <p className="text-sm font-medium">No rubrics yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(true)}
            >
              Create First Rubric
            </Button>
          </div>
        ) : filteredRubrics.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm italic">
            No results for "{search}"
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredRubrics.map((rubric) => (
              <div
                key={rubric.id}
                className="group p-4 rounded-lg border hover:border-primary/50 transition-all flex flex-col justify-between h-32"
              >
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-bold text-sm truncate">
                      {rubric.title}
                    </h4>

                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-[9px]">
                        {rubric.criteria?.length || 0} Criteria
                      </Badge>

                      <Badge variant="outline" className="text-[9px]">
                        {rubric.total_points} pts
                      </Badge>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={() => setRubricToDelete({ id: rubric.id, title: rubric.title })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  <span>Deleting won’t affect past marks</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <AlertDialog open={rubricToDelete !== null} onOpenChange={(open) => !open && setRubricToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rubric?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes "{rubricToDelete?.title}" from your library. Past marks remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rubricToDelete && handleDelete(rubricToDelete.id, rubricToDelete.title)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};