"use client";

import React, { useState } from "react";

import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow
} from "@/components/ui/table";

import { format } from "date-fns";
import { Calendar, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TeacherFileRecordOfWorkProps {
  termId: string;
  classId?: string;
}

export const TeacherFileRecordOfWork = ({ termId, classId }: TeacherFileRecordOfWorkProps) => {

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Temporary safe placeholders during migration away from Dexie.
  // Keep component props + JSX stable without runtime fetches/crashes.
  void termId;
  void classId;
  void setLogs;
  void setLoading;

  if (!logs.length) {
    return (
      <div className="py-2 text-slate-600 text-sm italic font-medium">
        Curriculum coverage records are maintained externally.
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black uppercase flex items-center gap-2">
          <CheckCircle2 className="h-3 w-3" />
          Automated Record of Work
        </h4>

        <span className="text-[9px] font-bold text-slate-400">
          {logs.length} entries
        </span>
      </div>

      <div className="border rounded-xl overflow-x-auto">

        <Table className="min-w-[600px]">

          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Work Covered</TableHead>
              <TableHead className="text-right">Homework</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {logs.map((log, idx) => (
              <TableRow
                key={log.id}
                className={cn(idx >= 15 && "hidden")}
              >
                <TableCell>
                  <div className="flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(log.date), "dd/MM/yy")}
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="outline">
                    {log.className}
                  </Badge>
                </TableCell>

                <TableCell>
                  <p className="text-sm whitespace-pre-wrap">
                    {log.content}
                  </p>
                </TableCell>

                <TableCell className="text-right">
                  {log.homework ? (
                    <span className="text-xs italic">
                      "{log.homework}"
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      None
                    </span>
                  )}
                </TableCell>

              </TableRow>
            ))}
          </TableBody>

        </Table>

        {logs.length > 15 && (
          <div className="p-2 text-center text-xs text-muted-foreground">
            + {logs.length - 15} more entries
          </div>
        )}

      </div>
    </div>
  );
};