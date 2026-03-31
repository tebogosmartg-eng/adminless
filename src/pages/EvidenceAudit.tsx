import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from '@/lib/dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, FileText, Image as ImageIcon, Search, ExternalLink, Filter, Calendar, Download, Lock, CheckCircle2, AlertTriangle, Loader2, FileSearch, FileWarning } from 'lucide-react';
import { format } from 'date-fns';
import { getSignedFileUrl } from '@/services/storage';
import { showSuccess, showError } from '@/utils/toast';
import { Evidence, Term, ClassInfo, Learner } from '@/lib/types';
import { useAcademic } from '@/context/AcademicContext';
import { useAuthGuard } from '@/hooks/useAuthGuard';

interface EvidenceWithContext extends Evidence {
  className: string;
  subject: string;
  learnerName: string;
  termName: string;
  isLocked: boolean;
  isModerationSample: boolean;
}

const EvidenceAuditContent = ({ embedded = false, defaultClassId }: { embedded?: boolean, defaultClassId?: string }) => {
  const { activeTerm } = useAcademic();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  const terms = useLiveQuery(() => db.terms.toArray()) || [];

  useEffect(() => {
    if (activeTerm) {
        setTermFilter(activeTerm.id);
    }
  }, [activeTerm?.id]);

  const auditData = useLiveQuery(async () => {
    const evidenceRaw = await db.evidence.orderBy('created_at').reverse().toArray();
    const evidence = defaultClassId ? evidenceRaw.filter(e => e.class_id === defaultClassId) : evidenceRaw;

    const activeClasses = await db.classes.filter(c => !c.archived).toArray();
    const samples = await db.moderation_samples.toArray();
    
    const classIds = [...new Set(evidence.map(e => e.class_id))];
    const learnerIds = [...new Set(evidence.filter(e => e.learner_id).map(e => e.learner_id!))];
    const termIds = [...new Set(evidence.filter(e => e.term_id).map(e => e.term_id!))];
    
    const [learners, termDetails] = await Promise.all([
        db.learners.where('id').anyOf(learnerIds).toArray(),
        db.terms.where('id').anyOf(termIds).toArray()
    ]);

    const classMap = new Map(activeClasses.map(c => [c.id, c as ClassInfo]));
    const learnerMap = new Map(learners.map(l => [l.id!, l as Learner]));
    const termMap = new Map(termDetails.map(t => [t.id, t as Term]));

    const sampleMap = new Map<string, Set<string>>();
    samples.forEach(s => {
        sampleMap.set(s.class_id, new Set(s.learner_ids));
    });

    const enrichedEvidence = evidence.map(e => {
        const cls = classMap.get(e.class_id);
        const learner = e.learner_id ? learnerMap.get(e.learner_id) : null;
        const term = e.term_id ? termMap.get(e.term_id) : null;
        
        const isModSample = !!(e.learner_id && sampleMap.get(e.class_id)?.has(e.learner_id));

        return {
            ...e,
            className: (cls as any)?.className || "Deleted Class",
            subject: (cls as any)?.subject || "",
            learnerName: (learner as any)?.name || "Class Level",
            termName: (term as any)?.name || "General",
            isLocked: (term as any)?.closed || false,
            isModerationSample: isModSample
        } as EvidenceWithContext;
    });

    const gradeStats: Record<string, { total: number; withEvidence: number }> = {};
    activeClasses.forEach(c => {
        const grade = (c as any).grade;
        if (!gradeStats[grade]) gradeStats[grade] = { total: 0, withEvidence: 0 };
        gradeStats[grade].total++;
        if (evidence.some(e => e.class_id === c.id)) {
            gradeStats[grade].withEvidence++;
        }
    });

    return { enrichedEvidence, gradeStats, totalActive: activeClasses.length };
  }, [defaultClassId]) || { enrichedEvidence: [], gradeStats: {}, totalActive: 0 };

  const filtered = useMemo(() => {
    return auditData.enrichedEvidence.filter(e => {
        const matchesSearch = 
            e.file_name.toLowerCase().includes(search.toLowerCase()) ||
            e.learnerName.toLowerCase().includes(search.toLowerCase()) ||
            e.className.toLowerCase().includes(search.toLowerCase());
        
        const matchesCategory = categoryFilter === 'all' || 
                                (categoryFilter === 'moderation_sample' ? e.isModerationSample : e.category === categoryFilter);
        const matchesTerm = termFilter === 'all' || e.term_id === termFilter;

        return matchesSearch && matchesCategory && matchesTerm;
    });
  }, [auditData.enrichedEvidence, search, categoryFilter, termFilter]);

  const handleViewFile = async (item: Evidence) => {
      setLoadingFileId(item.id);
      try {
          const url = await getSignedFileUrl(item.file_path);
          window.open(url, '_blank', 'noreferrer');
      } catch (e) {
          console.error(e);
          showError("Failed to generate secure preview link.");
      } finally {
          setLoadingFileId(null);
      }
  };

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'script': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'moderation': return <ShieldCheck className="h-5 w-5 text-green-600" />;
      case 'photo': return <ImageIcon className="h-5 w-5 text-purple-500" />;
      default: return <FileSearch className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className={`space-y-6 w-full ${embedded ? 'pb-2' : 'pb-12'}`}>
      {!embedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
              <h1 className="text-3xl font-bold tracking-tight">Evidence Audit</h1>
              <p className="text-muted-foreground text-sm">Professional moderation trail management.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 text-xs font-bold uppercase tracking-widest">
              <ShieldCheck className="h-3.5 w-3.5" /> Immutable Records
          </div>
        </div>
      )}

      {!embedded && (
        <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Compliance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(auditData.gradeStats).sort().map(([grade, stats]) => {
                            const percent = Math.round((stats.withEvidence / stats.total) * 100);
                            return (
                                <div key={grade} className="p-3 rounded-lg border bg-muted/20 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold">{grade}</span>
                                        <span className={`text-[10px] font-bold px-1.5 rounded ${percent === 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {percent}%
                                        </span>
                                    </div>
                                    <Progress value={percent} className="h-1" />
                                    <p className="text-[10px] text-muted-foreground">
                                        {stats.withEvidence} of {stats.total} classes covered
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
            
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-widest">
                      <ShieldCheck className="h-4 w-4" /> Audit Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Total Evidence Files</span>
                        <span className="text-xl font-bold">{auditData.enrichedEvidence.length}</span>
                    </div>
                    <div className="pt-2">
                        <div className="flex items-center gap-2 p-2 bg-background rounded border text-[10px]">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span>Ensure 10% sample scripts are uploaded per class for moderation.</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}

      <Card className="bg-muted/30 border-none shadow-none">
        <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search learner, class, or file name..." 
                        className="pl-9 w-full"
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
                    <SelectTrigger className="w-full md:w-[220px]">
                        <Filter className="mr-2 h-4 w-4 opacity-50" />
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="moderation_sample" className="font-bold text-primary">Moderation Samples Only</SelectItem>
                        <SelectItem value="script">Learner Scripts</SelectItem>
                        <SelectItem value="moderation">Moderation Notes</SelectItem>
                        <SelectItem value="photo">Photos/Portfolios</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

      <Card className="w-full overflow-hidden">
        <CardContent className="p-0 overflow-x-auto w-full">
          <Table className="min-w-[800px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">File Name</TableHead>
                <TableHead>Linked To</TableHead>
                {!embedded && <TableHead>Class</TableHead>}
                <TableHead>Term</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={embedded ? 5 : 6} className="h-64 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="h-10 w-10 opacity-10" />
                        <p>No evidence matching your criteria.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-md group-hover:bg-primary/10 transition-colors">
                          {getIcon(item.category)}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm truncate max-w-[200px]" title={item.file_name}>{item.file_name}</span>
                            <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[9px] h-4 uppercase px-1">{item.category}</Badge>
                                {item.isModerationSample && (
                                    <Badge className="bg-primary/10 text-primary border-none text-[8px] h-3.5 uppercase px-1">Moderation Sample</Badge>
                                )}
                                {item.isLocked && <Lock className="h-2.5 w-2.5 text-muted-foreground opacity-50" />}
                            </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                        {item.learnerName}
                    </TableCell>
                    {!embedded && (
                      <TableCell className="text-sm">
                          <div className="flex flex-col">
                              <span className="font-medium">{item.className}</span>
                              <span className="text-[10px] text-muted-foreground">{item.subject}</span>
                          </div>
                      </TableCell>
                    )}
                    <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{item.termName}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                        {item.created_at ? format(new Date(item.created_at), 'dd MMM yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewFile(item)} disabled={loadingFileId === item.id} title="Open Secure Document">
                        {loadingFileId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
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
      <div className="flex h-[50vh] w-full items-center justify-center animate-in fade-in duration-500">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Verifying Session...</p>
        </div>
      </div>
    );
  }

  return <EvidenceAuditContent />;
};

export default EvidenceAudit;