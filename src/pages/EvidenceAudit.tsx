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
import { ShieldCheck, FileText, Image as ImageIcon, Search, ExternalLink, Filter, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const EvidenceAudit = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const evidenceData = useLiveQuery(async () => {
    const evidence = await db.evidence.orderBy('created_at').reverse().toArray();
    const classIds = [...new Set(evidence.map(e => e.class_id))];
    const learnerIds = [...new Set(evidence.filter(e => e.learner_id).map(e => e.learner_id!))];
    
    const [classes, learners] = await Promise.all([
        db.classes.where('id').anyOf(classIds).toArray(),
        db.learners.where('id').anyOf(learnerIds).toArray()
    ]);

    const classMap = new Map(classes.map(c => [c.id, c]));
    const learnerMap = new Map(learners.map(l => [l.id, l]));

    return evidence.map(e => ({
        ...e,
        className: classMap.get(e.class_id)?.className || "Deleted Class",
        subject: classMap.get(e.class_id)?.subject || "",
        learnerName: e.learner_id ? learnerMap.get(e.learner_id)?.name : "Class Level"
    }));
  }) || [];

  const filtered = useMemo(() => {
    return evidenceData.filter(e => {
        const matchesSearch = 
            e.file_name.toLowerCase().includes(search.toLowerCase()) ||
            e.learnerName?.toLowerCase().includes(search.toLowerCase()) ||
            e.className.toLowerCase().includes(search.toLowerCase());
        
        const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });
  }, [evidenceData, search, categoryFilter]);

  const getPublicUrl = (path: string) => {
      const { data } = supabase.storage.from('evidence').getPublicUrl(path);
      return data.publicUrl;
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Evidence Audit</h1>
        <p className="text-muted-foreground">Centralized repository for moderation proof and assessment scripts.</p>
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
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Category" />
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
            Showing {filtered.length} of {evidenceData.length} records.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Linked To</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center text-muted-foreground">
                    No evidence records found.
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
                        <div className="flex flex-col">
                            <span className="font-medium text-sm truncate max-w-[200px]">{item.file_name}</span>
                            {item.notes && <span className="text-[10px] text-muted-foreground italic truncate max-w-[200px]">{item.notes}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                        {item.learnerName}
                    </TableCell>
                    <TableCell className="text-sm">
                        <div className="flex flex-col">
                            <span>{item.className}</span>
                            <span className="text-[10px] text-muted-foreground">{item.subject}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(item.created_at!), 'dd MMM yyyy')}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={getPublicUrl(item.file_path)} target="_blank" rel="noreferrer">
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