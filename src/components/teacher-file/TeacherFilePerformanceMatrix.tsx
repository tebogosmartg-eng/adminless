"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClassData {
    id: string;
    name: string;
    subject: string;
    grade: string;
    average: string;
    passRate: number;
}

interface TeacherFilePerformanceMatrixProps {
  classes: ClassData[];
}

export const TeacherFilePerformanceMatrix = ({ classes }: TeacherFilePerformanceMatrixProps) => {
  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Target className="h-3 w-3 text-primary" /> Term Performance Matrix
          </h4>
      </div>

      <div className="border rounded-xl bg-white overflow-x-auto w-full shadow-sm">
          <Table className="min-w-[500px] w-full">
              <TableHeader className="bg-slate-50">
                  <TableRow>
                      <TableHead className="text-[9px] font-black uppercase">Class Context</TableHead>
                      <TableHead className="text-center text-[9px] font-black uppercase">Term Average</TableHead>
                      <TableHead className="text-center text-[9px] font-black uppercase">Pass Rate</TableHead>
                      <TableHead className="text-center text-[9px] font-black uppercase">Status</TableHead>
                      <TableHead className="text-right text-[9px] font-black uppercase">Trend</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {classes.map((cls) => {
                      const avgNum = parseFloat(cls.average);
                      const isLow = avgNum < 50;
                      const isHigh = avgNum >= 75;

                      return (
                          <TableRow key={cls.id}>
                              <TableCell>
                                  <div className="flex flex-col">
                                      <span className="text-xs font-black text-slate-900">{cls.name}</span>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase">{cls.subject}</span>
                                  </div>
                              </TableCell>
                              <TableCell className="text-center">
                                  <span className={cn(
                                      "text-sm font-black",
                                      isLow ? "text-red-600" : isHigh ? "text-green-600" : "text-blue-600"
                                  )}>
                                      {cls.average}%
                                  </span>
                              </TableCell>
                              <TableCell className="text-center">
                                  <div className="flex flex-col items-center gap-1">
                                      <span className="text-xs font-bold">{cls.passRate}%</span>
                                      <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                          <div 
                                            className={cn("h-full", cls.passRate < 50 ? "bg-red-500" : "bg-green-500")}
                                            style={{ width: `${cls.passRate}%` }}
                                          />
                                      </div>
                                  </div>
                              </TableCell>
                              <TableCell className="text-center">
                                  {isLow ? (
                                      <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-100 text-[8px] h-4 uppercase font-black">Intervention</Badge>
                                  ) : isHigh ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[8px] h-4 uppercase font-black">Excellence</Badge>
                                  ) : (
                                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 text-[8px] h-4 uppercase font-black">Stable</Badge>
                                  )}
                              </TableCell>
                              <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1 text-slate-400">
                                      {isHigh ? <TrendingUp className="h-3 w-3 text-green-500" /> : isLow ? <TrendingDown className="h-3 w-3 text-red-500" /> : <Minus className="h-3 w-3" />}
                                  </div>
                              </TableCell>
                          </TableRow>
                      );
                  })}
              </TableBody>
          </Table>
      </div>

      {classes.some(c => parseFloat(c.average) < 50) && (
          <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <p className="text-[9px] text-red-800 leading-tight font-medium">
                  <strong>Moderation Alert:</strong> One or more classes are achieving below 50% term average. Ensure the Subject Improvement Plan (Section 5.6) includes specific root-cause analysis for these groups.
              </p>
          </div>
      )}
    </div>
  );
};