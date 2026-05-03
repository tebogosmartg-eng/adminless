"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAcademic } from "@/context/AcademicContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Loader2 } from "lucide-react";

import { format } from "date-fns";
import { useDebounce } from "@/hooks/useDebounce";
import { useAsyncState } from "@/hooks/useAsyncState";
import { AsyncStatus } from "@/components/ui/AsyncStatus";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModerationSample } from "@/lib/types";

const ModerationAuditContent = () => {
  const { activeTerm } = useAcademic();

  const [samples, setSamples] = useState<ModerationSample[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [termFilter, setTermFilter] = useState("all");

  const [loading, setLoading] = useState(false);
  const [loadingTimeoutReached, setLoadingTimeoutReached] = useState(false);
  const loadInProgressRef = useRef(false);
  const loadState = useAsyncState();

  useEffect(() => {
    const loadData = async () => {
      if (loadInProgressRef.current) return;

      loadInProgressRef.current = true;
      setLoading(true);
      try {
        await loadState.run(async () => {
          const { data: sessionData } = await supabase.auth.getSession();
          const user = sessionData?.session?.user;
          if (!user) throw new Error("Session expired");

          const [samplesRes, classRes, termRes] = await Promise.all([
            supabase.from("moderation_samples").select("*").eq("user_id", user.id),
            supabase.from("classes").select("*").eq("user_id", user.id),
            supabase.from("terms").select("*"),
          ]);

          if (samplesRes.error) throw samplesRes.error;
          if (classRes.error) throw classRes.error;
          if (termRes.error) throw termRes.error;

          setSamples((samplesRes.data || []) as ModerationSample[]);
          setClasses(classRes.data || []);
          setTerms(termRes.data || []);
        }, { status: "loading" });
      } catch (error) {
        console.error("Moderation audit load failed:", error);
        setSamples([]);
        setClasses([]);
        setTerms([]);
      } finally {
        loadInProgressRef.current = false;
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadingTimeoutReached(false);
      return;
    }
    const timer = window.setTimeout(() => setLoadingTimeoutReached(true), 3000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (activeTerm?.id) {
      setTermFilter(activeTerm.id);
    }
  }, [activeTerm?.id]);

  const enriched = useMemo(() => {
    return samples.map((s) => {
      const cls = classes.find((c) => c.id === s.class_id);
      const term = terms.find((t) => t.id === s.term_id);
      return {
        ...s,
        className: cls?.class_name || cls?.className || "Unknown",
        subject: cls?.subject || "",
        termName: term?.name || "—",
      };
    });
  }, [samples, classes, terms]);

  const filtered = useMemo(() => {
    const normalizedSearch = debouncedSearch.toLowerCase();
    return enriched.filter((row) => {
      const matchesSearch =
        row.className?.toLowerCase().includes(normalizedSearch) ||
        row.subject?.toLowerCase().includes(normalizedSearch) ||
        row.termName?.toLowerCase().includes(normalizedSearch);

      const matchesTerm = termFilter === "all" || row.term_id === termFilter;

      return matchesSearch && matchesTerm;
    });
  }, [enriched, debouncedSearch, termFilter]);

  const basisLabel = (b: string | undefined) =>
    b === "assessment" ? "Assessment task" : "Term overall";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Moderation overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Saved moderation samples by class and term. AdminLess records the learner selection only—not documents.
        </p>
      </div>

      <AsyncStatus
        state={{
          status: loading ? "loading" : loadState.status,
          error: loadState.error,
          retry: loadState.retry,
        }}
      />
      {loadingTimeoutReached && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Moderation data is taking longer than expected. Please wait or refresh.
        </div>
      )}

      <Card>
        <CardContent className="pt-6 flex gap-4">
          <Input
            placeholder="Search class or term..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select value={termFilter ?? ""} onValueChange={setTermFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All terms</SelectItem>
              {terms.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Saved samples</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Basis</TableHead>
                <TableHead className="text-right">Learners in sample</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={`moderation-loading-${idx}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No saved moderation samples match this filter.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.className}</TableCell>
                    <TableCell>{row.subject || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.termName}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {basisLabel(row.rules_json?.basis)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.learner_ids?.length ?? 0}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.updated_at
                        ? format(new Date(row.updated_at), "dd MMM yyyy HH:mm")
                        : row.created_at
                          ? format(new Date(row.created_at), "dd MMM yyyy")
                          : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const EvidenceAudit = () => {
  const { user, authReady } = useAuthGuard();
  const [authWaitTimedOut, setAuthWaitTimedOut] = useState(false);

  useEffect(() => {
    if (authReady) {
      setAuthWaitTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setAuthWaitTimedOut(true), 3000);
    return () => window.clearTimeout(timer);
  }, [authReady]);

  if (!authReady && !authWaitTimedOut) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            We could not confirm your session. Please retry.
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return <ModerationAuditContent />;
};

export default EvidenceAudit;
