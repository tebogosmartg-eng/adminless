import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Filter, Download, FileSpreadsheet, LineChart as LineChartIcon } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ClassInfo, GradeSymbol, AggregatedLearner } from '@/lib/types';
import { getGradeSymbol } from '@/utils/grading';

interface ReportsResultsProps {
  aggregatedData: AggregatedLearner[] | null;
  trendData: any[];
  selectedClassIds: string[];
  classes: ClassInfo[];
  weights: { [id: string]: string };
  gradingScheme: GradeSymbol[];
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export const ReportsResults = ({
  aggregatedData,
  trendData,
  selectedClassIds,
  classes,
  weights,
  gradingScheme,
  onExportCSV,
  onExportPDF
}: ReportsResultsProps) => {
  return (
    <div className="space-y-6">
       {aggregatedData && trendData.length > 1 && (
         <Card>
            <CardHeader className="pb-2">
               <CardTitle className="text-lg flex items-center gap-2">
                  <LineChartIcon className="h-4 w-4 text-primary" /> Cohort Performance Trend
               </CardTitle>
               <CardDescription>Average performance across selected assessments (chronological).</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 12}} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                           contentStyle={{ borderRadius: '8px', border: '1px solid #eee' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="average" name="Class Average" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="passRate" name="Pass Rate" stroke="hsl(var(--destructive))" strokeWidth={2} />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>
       )}

       <Card className="h-full flex flex-col min-h-[500px]">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <div>
                <CardTitle>Results Preview</CardTitle>
                <CardDescription>
                   {aggregatedData ? `Generated for ${aggregatedData.length} learners` : "Select assessments to generate report."}
                </CardDescription>
             </div>
             {aggregatedData && (
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={onExportCSV} className="flex-1 sm:flex-none h-10 sm:h-9">
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={onExportPDF} className="flex-1 sm:flex-none h-10 sm:h-9">
                        <Download className="mr-2 h-4 w-4" /> PDF
                    </Button>
                </div>
             )}
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
             {aggregatedData ? (
                <div className="h-full max-h-[600px] overflow-x-auto w-full no-scrollbar border-t">
                    <Table className="min-w-[600px] w-full table-fixed">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead className="w-[200px] sticky left-0 bg-muted/90 z-10 border-r">Learner Name</TableHead>
                                {selectedClassIds.map(id => {
                                    const c = classes.find(cls => cls.id === id);
                                    return (
                                        <TableHead key={id} className="text-right whitespace-nowrap min-w-[120px]">
                                            <div className="flex flex-col">
                                                <span>{c?.className}</span>
                                                <span className="text-[10px] text-muted-foreground font-normal">{weights[id]}%</span>
                                            </div>
                                        </TableHead>
                                    )
                                })}
                                <TableHead className="text-right font-bold bg-muted/50 w-[100px]">Final %</TableHead>
                                <TableHead className="text-center bg-muted/50 w-[80px]">Sym</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {aggregatedData.map((learner, idx) => {
                                const symbol = getGradeSymbol(learner.finalMark, gradingScheme);
                                return (
                                    <TableRow key={idx}>
                                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                        <TableCell className="font-medium sticky left-0 bg-background z-10 border-r">{learner.name}</TableCell>
                                        {selectedClassIds.map(id => (
                                            <TableCell key={id} className="text-right">
                                                {learner.marks[id] !== null ? learner.marks[id] : <span className="text-muted-foreground">-</span>}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right font-bold bg-muted/30">
                                            {learner.finalMark}
                                        </TableCell>
                                        <TableCell className="text-center bg-muted/30">
                                            {symbol && (
                                                <Badge variant="outline" className={symbol.badgeColor}>
                                                    {symbol.symbol}
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground p-6 text-center">
                    <Filter className="h-12 w-12 mb-4 opacity-20" />
                    <p>Configure settings and click Calculate to view results.</p>
                </div>
             )}
          </CardContent>
       </Card>
    </div>
  );
};