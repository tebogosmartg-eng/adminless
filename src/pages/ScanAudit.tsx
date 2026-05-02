"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthGuard } from "@/hooks/useAuthGuard";

import {
  Card, CardContent
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import {
  Search,
  ExternalLink,
  Loader2,
  FileText,
  Users,
  ClipboardList,
  FileSearch
} from "lucide-react";

import { format } from "date-fns";
import { getSignedFileUrl } from "@/services/storage";
import { useDebounce } from "@/hooks/useDebounce";
import { useAsyncState } from "@/hooks/useAsyncState";
import { AsyncStatus } from "@/components/ui/AsyncStatus";
import { Skeleton } from "@/components/ui/skeleton";

const ScanAuditContent = () => {
  const [loading, setLoading] = useState(true);

  const [logs, setLogs] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
  const loadState = useAsyncState();
  const fileState = useAsyncState();

  // 🔥 FETCH FROM SUPABASE
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        await loadState.run(async () => {
          const [logsRes, classRes, termRes] = await Promise.all([
            supabase.from("scan_history").select("*").order("timestamp", { ascending: false }),
            supabase.from("classes").select("*"),
            supabase.from("terms").select("*"),
          ]);

          if (logsRes.error) throw logsRes.error;
          if (classRes.error) throw classRes.error;
          if (termRes.error) throw termRes.error;

          setLogs(logsRes.data || []);
          setClasses(classRes.data || []);
          setTerms(termRes.data || []);
        }, { status: "loading" });
      } catch (error) {
        console.error(error);
      }

      setLoading(false);
    };

    load();
  }, []);

  // 🔥 ENRICH DATA
  const enriched = useMemo(() => {
    return logs.map((l) => {
      const cls = classes.find((c) => c.id === l.class_id);
      const term = terms.find((t) => t.id === l.term_id);

      return {
        ...l,
        className: cls?.className || "Unknown",
        termName: term?.name || "General",
      };
    });
  }, [logs, classes, terms]);

  // 🔥 FILTER
  const filtered = useMemo(() => {
    const normalizedSearch = debouncedSearch.toLowerCase();
    return enriched.filter((l) =>
      l.className.toLowerCase().includes(normalizedSearch) ||
      l.scan_type.toLowerCase().includes(normalizedSearch)
    );
  }, [enriched, debouncedSearch]);

  const handleViewFile = async (item: any) => {
    if (!item.file_path) return;

    setLoadingFileId(item.id);
    try {
      const url = await fileState.run(
        async () => getSignedFileUrl(item.file_path),
        { status: "loading" },
      );
      window.open(url, "_blank");
    } finally {
      setLoadingFileId(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "class_marksheet":
        return <Users className="h-4 w-4 text-blue-500" />;
      case "individual_script":
        return <FileText className="h-4 w-4 text-purple-500" />;
      case "attendance_register":
        return <ClipboardList className="h-4 w-4 text-green-600" />;
      default:
        return <FileSearch className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-11 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AsyncStatus
        state={{
          status: loading ? "loading" : (fileState.status !== "idle" ? fileState.status : loadState.status),
          error: fileState.error ?? loadState.error,
          retry: fileState.status === "error" ? fileState.retry : loadState.retry,
        }}
      />

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search class or scan type..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Records</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No scan logs found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {format(new Date(item.timestamp), "dd MMM yyyy HH:mm")}
                    </TableCell>

                    <TableCell className="flex items-center gap-2">
                      {getIcon(item.scan_type)}
                      {item.scan_type}
                    </TableCell>

                    <TableCell>{item.className}</TableCell>

                    <TableCell>
                      <Badge>{item.replacement_mode}</Badge>
                    </TableCell>

                    <TableCell>
                      {item.after_snapshot?.length || 0}
                    </TableCell>

                    <TableCell>
                      {item.file_path && (
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
                      )}
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

const ScanAudit = () => {
  const { user, authReady } = useAuthGuard();

  if (!authReady || !user) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return <ScanAuditContent />;
};

export default ScanAudit;