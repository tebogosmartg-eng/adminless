"use client";

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, FileText, Image as ImageIcon, Search, ExternalLink, Filter, Calendar, Download, Lock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess } from '@/utils/toast';
import { Evidence, Term, ClassInfo, Learner } from '@/lib/types';

interface EvidenceWithContext extends Evidence {
  className: string;
  subject: string;
  learnerName: string;
  termName: string;
  isLocked: boolean;
}

const EvidenceAudit = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");

  // Load basic context for filters
  const terms = useLiveQuery(() => db.terms.toArray()) || [];

  const evidenceData = useLiveQuery(async (): Promise<EvidenceWithContext[]> => {
    const evidence = await db.evidence.orderBy('created_at').reverse().toArray();
    if (evidence.length === 0) return [];

    const classIds = [...new Set(evidence.map(e => e.class_id))];
    const learnerIds = [...new Set(evidence.filter(e => e.learner_id).map(e => e.learner_id!))];
    const termIds = [...new Set(evidence.filter(e => e.term_id).map(e => e.term_id!))];
    
    const [classes, learners, termDetails] = await Promise.all([
        db.classes.where('id').anyOf(classIds).toArray(),
        db.learners.where('id').anyOf(learnerIds).toArray(),
        db.terms.where('id').anyOf(termIds).toArray()
    ]);

    const classMap = new Map<string, ClassInfo>(classes.map(c => [c.id, c as any]));
    const learnerMap = new Map<string, Learner>(learners.map(l => [l.id!, l]));
    const termMap = new Map<string, Term>(termDetails.map(t => [t.id, t]));

    return evidence.map(e => {
        const cls = classMap.get(e.class_id);
        const learner = e.learner_id ? learnerMap.get(e.learner_id) : null;
        const term = e.term_id ? termMap.get(e.term_id) : null;
        
        return {
            ...e,
            className: cls?.className || "Deleted Class",
            subject: cls?.subject || "",
            learnerName: learner?.name || "Class Level",
            termName: term?.name || "General",
            isLocked: term?.closed || false
        };
    });
  }, []) || [];

  const filtered = useMemo(() => {
    return evidenceData.filter(e => {
        const matchesSearch = 
            e.file_name.toLowerCase().includes(search.toLowerCase()) ||
            e.learnerName.toLowerCase().includes(search.toLowerCase()) ||
            e.className.toLowerCase().includes(search.toLowerCase());
        
        const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
        const matchesTerm = termFilter === 'all' || e.term_id === termFilter;

        return matchesSearch && matchesCategory && matchesTerm;
    });
  }, [evidenceData, search, categoryFilter, termFilter]);

  const getPublicUrl = (path: string) => {
      const { data } = supabase.storage.from('evidence').getPublicUrl(path);
      return data.publicUrl;
  };

  const handleExportLog = () => {
    const header = "File Name,Category,Linked To,Class,Subject,Term,Upload Date\n";
    const rows = filtered.map(e => 
        `"${e.file_name}","${e.category}","${e.learnerName}","${e.className}","${e.subject}","${e.termName}","${format(new Date(e.created_at!), 'yyyy-MM-dd')}"`
    ).join("\n");
    
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Evidence_Audit_Log_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    showSuccess("Audit log exported as CSV.");
  };

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'script': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'moderation': return <ShieldCheck className="h-4 w-4 text-green-600" />;
      case 'photo': return <ImageIcon className="h-4 w-4 text-purple-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Evidence Audit</h1>
            <p className="text-muted-foreground text-sm">Centralized repository for moderation proof and assessment scripts.</p>
        </div>
        <Button onClick={handleExportLog} disabled={filtered.length === 0} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export Audit Log
        </Button>
      </div>

      <Card className="bg-muted/30 border-none shadow-none">
        <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search student, class, or file name..." 
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={termFilter} onValueChange={setTermFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <Calendar className="mr-2 h-4 w-4 opacity-50" />
                        <SelectValue placeholder="All Terms" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Terms</SelectItem>
                        {terms.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <Filter className="mr-2 h-4 w-4 opacity-50" />
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="script">Student Scripts</SelectItem>
                        <SelectItem value="moderation">Moderation Notes</SelectItem>
                        <SelectItem value="photo">Photos/Portfolios</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Audit Log</CardTitle>
          <CardDescription>
            {evidenceData.length === 0 ? "No evidence recorded yet." : `Showing ${filtered.length} of ${evidenceData.length} records.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">File Name</TableHead>
                <TableHead>Linked To</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="h-10 w-10 opacity-10" />
                        <p>No evidence matching your criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md group-hover:bg-primary/10 transition-colors">
                          {getIcon(item.category)}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm truncate max-w-[200px]" title={item.file_name}>{item.file_name}</span>
                            <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[9px] h-4 uppercase px-1">{item.category}</Badge>
                                {item.isLocked && <Lock className="h-2.5 w-2.5 text-muted-foreground opacity-50" />}
                            </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                        {item.learnerName}
                    </TableCell>
                    <TableCell className="text-sm">
                        <div className="flex flex-col">
                            <span className="font-medium">{item.className}</span>
                            <span className="text-[10px] text-muted-foreground">{item.subject}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{item.termName}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                        {item.created_at ? format(new Date(item.created_at), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <a href={getPublicUrl(item.file_path)} target="_blank" rel="noreferrer" title="Open Document">
                          <ExternalLink className="h-4 w-4" />
                        </a>
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

export default EvidenceAudit;