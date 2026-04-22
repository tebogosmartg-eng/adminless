"use client";

import { useState, useEffect, useMemo } from "react";
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

const EvidenceAuditContent = () => {
  const { activeTerm } = useAcademic();

  const [loading, setLoading] = useState(true);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [learners, setLearners] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [termFilter, setTermFilter] = useState("all");

  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  // 🔥 FETCH EVERYTHING FROM SUPABASE
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const [
        evidenceRes,
        classRes,
        learnerRes,
        termRes
      ] = await Promise.all([
        supabase.from("evidence").select("*"),
        supabase.from("classes").select("*"),
        supabase.from("learners").select("*"),
        supabase.from("terms").select("*"),
      ]);

      if (evidenceRes.error) console.error(evidenceRes.error);
      if (classRes.error) console.error(classRes.error);
      if (learnerRes.error) console.error(learnerRes.error);
      if (termRes.error) console.error(termRes.error);

      setEvidence(evidenceRes.data || []);
      setClasses(classRes.data || []);
      setLearners(learnerRes.data || []);
      setTerms(termRes.data || []);

      setLoading(false);
    };

    loadData();
  }, []);

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
    return enriched.filter((e) => {
      const matchesSearch =
        e.file_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.learnerName?.toLowerCase().includes(search.toLowerCase()) ||
        e.className?.toLowerCase().includes(search.toLowerCase());

      const matchesTerm =
        termFilter === "all" || e.term_id === termFilter;

      return matchesSearch && matchesTerm;
    });
  }, [enriched, search, termFilter]);

  const handleViewFile = async (item: any) => {
    setLoadingFileId(item.id);
    try {
      const url = await getSignedFileUrl(item.file_path);
      window.open(url, "_blank");
    } finally {
      setLoadingFileId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 flex gap-4">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select value={termFilter} onValueChange={setTermFilter}>
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
              {filtered.length === 0 ? (
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

  if (!authReady || !user) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return <EvidenceAuditContent />;
};

export default EvidenceAudit;