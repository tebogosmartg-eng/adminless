"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, RefreshCw, Loader2, AlertCircle, Database, CheckCircle2, Clock } from "lucide-react";
import { useSupabaseAudit, AuditRecord } from "@/hooks/useSupabaseAudit";
import { format } from "date-fns";

export const SupabaseAudit = () => {
  const { runAudit, isAuditing, results, activeYear, activeTerm } = useSupabaseAudit();

  const RecordTable = ({ title, records }: { title: string; records: AuditRecord[] }) => (
    <div className="space-y-2">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">{title}</h4>
      <div className="border rounded-md bg-background overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="h-8 text-[9px]">Timestamp</TableHead>
              <TableHead className="h-8 text-[9px]">Identifer</TableHead>
              <TableHead className="h-8 text-[9px]">Context (Year/Term)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-12 text-center text-[10px] text-muted-foreground italic">No remote records found.</TableCell>
              </TableRow>
            ) : (
              records.map((r) => (
                <TableRow key={r.id} className="h-10">
                  <TableCell className="py-1 text-[10px] font-mono whitespace-nowrap">
                    {format(new Date(r.created_at), 'HH:mm:ss (dd/MM)')}
                  </TableCell>
                  <TableCell className="py-1 text-[10px] font-bold truncate max-w-[120px]">
                    {r.title_or_name}
                  </TableCell>
                  <TableCell className="py-1">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] text-muted-foreground font-mono truncate max-w-[100px]">{r.year_id || 'NULL'}</span>
                        <span className="text-[8px] text-primary/60 font-mono truncate max-w-[100px]">{r.term_id || 'NULL'}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <Card className="border-blue-200 bg-blue-50/10">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                <CardTitle>Supabase Persistence Audit</CardTitle>
            </div>
            <Button onClick={runAudit} disabled={isAuditing} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                {isAuditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh Audit
            </Button>
        </div>
        <CardDescription>
            Verify that your local changes have been successfully persisted to the remote database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border bg-background space-y-1">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Current App Session</p>
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{activeYear?.name || 'None'} / {activeTerm?.name || 'None'}</span>
                    <Badge variant="outline" className="text-[8px] h-4">ACTIVE</Badge>
                </div>
                <p className="text-[8px] text-muted-foreground font-mono truncate">{activeTerm?.id}</p>
            </div>
            {results && (
                <div className={`p-3 rounded-lg border space-y-1 ${results.contextMatched ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Database Alignment</p>
                    <div className="flex items-center gap-2">
                        {results.contextMatched ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                        )}
                        <span className={`text-xs font-bold ${results.contextMatched ? 'text-green-800' : 'text-amber-800'}`}>
                            {results.contextMatched ? "Persisted data matches active session." : "Persisted data differs from session."}
                        </span>
                    </div>
                </div>
            )}
        </div>

        {results ? (
            <div className="grid gap-6">
                <RecordTable title="Latest 5 Classes" records={results.classes} />
                <RecordTable title="Latest 5 Assessments" records={results.assessments} />
                <RecordTable title="Latest 5 Mark Entries" records={results.marks} />
            </div>
        ) : (
            <div className="py-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground text-sm">
                <Clock className="h-8 w-8 opacity-20 mb-2" />
                <p>Click "Refresh Audit" to query Supabase state.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
};