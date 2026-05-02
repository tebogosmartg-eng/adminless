"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAcademic } from "@/context/AcademicContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";

import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

import {
  Search, ExternalLink, Loader2, FileText
} from "lucide-react";

import { format } from "date-fns";
import { getSignedFileUrl } from "@/services/storage";
import { useDebounce } from "@/hooks/useDebounce";
import { useAsyncState } from "@/hooks/useAsyncState";
import { AsyncStatus } from "@/components/ui/AsyncStatus";
import { Skeleton } from "@/components/ui/skeleton";

const EvidenceAuditContent = () => {
  const { activeTerm } = useAcademic();
  const termId = activeTerm?.id;

  const [evidence, setEvidence] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [learners, setLearners] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [termFilter, setTermFilter] = useState("all");

  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTimeoutReached, setLoadingTimeoutReached] = useState(false);
  const loadInProgressRef = useRef(false);
  const loadState = useAsyncState();
  const fileState = useAsyncState();

  // 🔥 FETCH EVERYTHING FROM SUPABASE
  useEffect(() => {
    const loadData = async () => {
      if (!termId) {
        setEvidence([]);
        setClasses([]);
        setLearners([]);
        setTerms([]);
        setLoading(false);
        return;
      }
      if (loadInProgressRef.current) return;

      loadInProgressRef.current = true;
      setLoading(true);
      try {
        await loadState.run(async () => {
          console.log("[Evidence] fetch triggered");
          const { data: sessionData } = await supabase.auth.getSession();
          const user = sessionData?.session?.user;
          if (!user) throw new Error("Session expired");

          const [
            evidenceRes,
            classRes,
            termRes
          ] = await Promise.all([
            supabase.from("evidence").select("*").eq("user_id", user.id),
            supabase.from("classes").select("*").eq("user_id", user.id),
            supabase.from("terms").select("*"),
          ]);

          if (evidenceRes.error) throw evidenceRes.error;
          if (classRes.error) throw classRes.error;
          if (termRes.error) throw termRes.error;

          const classIds = (classRes.data || []).map((item) => item.id);
          const learnerRes = classIds.length
            ? await supabase.from("learners").select("*").in("class_id", classIds)
            : { data: [], error: null };
          if (learnerRes.error) throw learnerRes.error;

          setEvidence(evidenceRes.data || []);
          setClasses(classRes.data || []);
          setLearners(learnerRes.data || []);
          setTerms(termRes.data || []);
        }, { status: "loading" });
      } catch (error) {
        console.error("Evidence audit load failed:", error);
        setEvidence([]);
        setClasses([]);
        setLearners([]);
        setTerms([]);
      } finally {
        loadInProgressRef.current = false;
        setLoading(false);
      }
    };

    void loadData();
  }, [termId]);

  useEffect(() => {
    if (!loading) {
      setLoadingTimeoutReached(false);
      return;
    }
    const timer = window.setTimeout(() => setLoadingTimeoutReached(true), 3000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  // 🔥 AUTO SET TERM
  useEffect(() => {
    if (activeTerm?.id) {
      setTermFilter(activeTerm.id);
    }
  }, [activeTerm?.id]);

  // 🔥 ENRICH DATA
  const enriched = useMemo(() => {
    return evidence.map((e) => {
      const cls = classes.find((c) => c.id === e.class_id);
      const learner = learners.find((l) => l.id === e.learner_id);
      const term = terms.find((t) => t.id === e.term_id);

      return {
        ...e,
        className: cls?.className || "Unknown",
        subject: cls?.subject || "",
        learnerName: learner?.name || "Class Level",
        termName: term?.name || "General",
        isLocked: term?.closed || false,
      };
    });
  }, [evidence, classes, learners, terms]);

  // 🔥 FILTER
  const filtered = useMemo(() => {
    const normalizedSearch = debouncedSearch.toLowerCase();
    return enriched.filter((e) => {
      const matchesSearch =
        e.file_name?.toLowerCase().includes(normalizedSearch) ||
        e.learnerName?.toLowerCase().includes(normalizedSearch) ||
        e.className?.toLowerCase().includes(normalizedSearch);

      const matchesTerm =
        termFilter === "all" || e.term_id === termFilter;

      return matchesSearch && matchesTerm;
    });
  }, [enriched, debouncedSearch, termFilter]);

  const handleViewFile = async (item: any) => {
    setLoadingFileId(item.id);
    try {
      const url = await fileState.run(
        () => getSignedFileUrl(item.file_path),
        { status: "loading" },
      );
      window.open(url, "_blank");
    } catch (error) {
      console.error("Evidence file open failed:", error);
    } finally {
      setLoadingFileId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AsyncStatus
        state={{
          status: loading ? "loading" : loadState.status,
          error: loadState.error,
          retry: loadState.retry,
        }}
      />
      {loadingTimeoutReached && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Evidence is taking longer than expected. Please wait or refresh.
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 flex gap-4">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select value={termFilter ?? ""} onValueChange={setTermFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {terms.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Learner</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Date</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={`evidence-loading-${idx}`}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No evidence found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.file_name}</TableCell>
                    <TableCell>{item.learnerName}</TableCell>
                    <TableCell>{item.className}</TableCell>
                    <TableCell>
                      <Badge>{item.termName}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.created_at
                        ? format(new Date(item.created_at), "dd MMM yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleViewFile(item)}
                      >
                        {loadingFileId === item.id ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                      </Button>
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
        <Loader2 className="animate-spin" />
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

  return <EvidenceAuditContent />;
};

export default EvidenceAudit;