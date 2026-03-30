import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
    History, 
    Search, 
    ExternalLink, 
    FileSearch, 
    ShieldCheck, 
    Loader2, 
    ClipboardList,
    FileText,
    Users
} from 'lucide-react';
import { format } from 'date-fns';
import { getSignedFileUrl } from '@/services/storage';
import { showError } from '@/utils/toast';
import { ScanHistory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthGuard } from '@/hooks/useAuthGuard';

const ScanAuditContent = ({ embedded = false, defaultClassId }: { embedded?: boolean, defaultClassId?: string }) => {
  const [search, setSearch] = useState("");
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  const logsRaw = useLiveQuery(() => 
    db.scan_history.orderBy('timestamp').reverse().toArray()
  ) || [];

  const logs = defaultClassId ? logsRaw.filter(l => l.class_id === defaultClassId) : logsRaw;

  const enrichedLogs = useLiveQuery(async () => {
    if (logs.length === 0) return [];
    
    const classIds = [...new Set(logs.map(l => l.class_id))];
    const termIds = [...new Set(logs.map(l => l.term_id))];
    
    const [classes, terms] = await Promise.all([
        db.classes.where('id').anyOf(classIds).toArray(),
        db.terms.where('id').anyOf(termIds).toArray()
    ]);

    const classMap = new Map(classes.map(c => [c.id, (c as any).className]));
    const termMap = new Map(terms.map(t => [t.id, (t as any).name]));

    return logs.map(l => ({
        ...l,
        className: classMap.get(l.class_id) || "Deleted Class",
        termName: termMap.get(l.term_id) || "General"
    }));
  }, [logs]) || [];

  const filtered = enrichedLogs.filter(l => 
    l.className.toLowerCase().includes(search.toLowerCase()) ||
    l.scan_type.toLowerCase().includes(search.toLowerCase())
  );

  const handleViewFile = async (item: ScanHistory) => {
      if (!item.file_path) return;
      setLoadingFileId(item.id);
      try {
          const url = await getSignedFileUrl(item.file_path);
          window.open(url, '_blank', 'noreferrer');
      } catch (e) {
          showError("Failed to generate secure preview link.");
      } finally {
          setLoadingFileId(null);
      }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'class_marksheet': return <Users className="h-4 w-4 text-blue-500" />;
      case 'individual_script': return <FileText className="h-4 w-4 text-purple-500" />;
      case 'attendance_register': return <ClipboardList className="h-4 w-4 text-green-600" />;
      default: return <FileSearch className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={`space-y-6 w-full ${embedded ? 'pb-2' : 'pb-12'}`}>
      {!embedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
              <h1 className="text-3xl font-bold tracking-tight">Scan Audit Logs</h1>
              <p className="text-muted-foreground text-sm">Permanent record of all AI data extractions and mark replacements.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 text-xs font-bold uppercase tracking-widest">
              <ShieldCheck className="h-3.5 w-3.5" /> Immutable Records
          </div>
        </div>
      )}

      <Card className="bg-muted/30 border-none shadow-none">
        <CardContent className="pt-6">
            <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by class or scan type..." 
                    className="pl-9 w-full"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
        </CardContent>
      </Card>

      <Card className="w-full overflow-hidden">
        <CardContent className="p-0 overflow-x-auto w-full">
          <Table className="min-w-[800px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Timestamp</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-center">Impact</TableHead>
                <TableHead className="text-right">Audit Proof</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <History className="h-10 w-10 opacity-10" />
                        <p>No scanning sessions recorded yet.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="text-sm font-medium">
                        <div className="flex flex-col">
                            <span>{format(new Date(item.timestamp), 'dd MMM yyyy')}</span>
                            <span className="text-[10px] text-muted-foreground">{format(new Date(item.timestamp), 'HH:mm:ss')}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-muted rounded group-hover:bg-primary/10 transition-colors">
                          {getIcon(item.scan_type)}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-tighter truncate max-w-[120px]">
                            {item.scan_type.replace('_', ' ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold truncate max-w-[150px]">{item.className}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">{item.termName}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline" className="text-[9px] uppercase font-black px-1.5 h-4 border-muted-foreground/30">
                            {item.replacement_mode}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold">
                                        {item.after_snapshot?.length || 0} Records
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="p-0 border-none shadow-xl">
                                    <div className="p-3 bg-card border rounded-lg max-w-xs space-y-2">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground">Change Statistics</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[8px] uppercase text-muted-foreground">Before</p>
                                                <p className="font-bold text-lg">{item.before_snapshot?.length || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] uppercase text-muted-foreground">After</p>
                                                <p className="font-bold text-lg">{item.after_snapshot?.length || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.file_path ? (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 gap-2 text-[10px] font-black uppercase tracking-widest hover:text-primary"
                            onClick={() => handleViewFile(item)} 
                            disabled={loadingFileId === item.id}
                        >
                            {loadingFileId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                            Original File
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic px-2">No file archived</span>
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
      <div className="flex h-[50vh] w-full items-center justify-center animate-in fade-in duration-500">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Verifying Session...</p>
        </div>
      </div>
    );
  }

  return <ScanAuditContent />;
};

export default ScanAudit;