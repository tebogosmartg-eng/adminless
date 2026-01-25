import { useState, useMemo } from 'react';
import { useClasses } from '@/context/ClassesContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Filter, Calculator, Download, FileSpreadsheet, RefreshCw, LineChart as LineChartIcon } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { ClassInfo } from '@/components/CreateClassDialog';
import { useSettings } from '@/context/SettingsContext';
import { getGradeSymbol } from '@/utils/grading';
import autoTable from 'jspdf-autotable';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { calculateClassStats } from '@/utils/stats';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface AggregatedLearner {
  name: string;
  marks: { [classId: string]: number | null };
  finalMark: number;
}

const Reports = () => {
  const { classes } = useClasses();
  const { gradingScheme, schoolName, teacherName } = useSettings();

  // Selection Filters
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  
  // Assessment Selection & Weighting
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [weights, setWeights] = useState<{ [classId: string]: string }>({}); // Using string for input handling
  
  // Results
  const [aggregatedData, setAggregatedData] = useState<AggregatedLearner[] | null>(null);

  // Filter Logic
  const uniqueGrades = useMemo(() => Array.from(new Set(classes.map(c => c.grade))).sort(), [classes]);
  const uniqueSubjects = useMemo(() => Array.from(new Set(classes.map(c => c.subject))).sort(), [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter(c => 
      !c.archived && 
      (selectedGrade === "all" || c.grade === selectedGrade) && 
      (selectedSubject === "all" || c.subject === selectedSubject)
    );
  }, [classes, selectedGrade, selectedSubject]);

  const handleClassToggle = (classId: string, checked: boolean) => {
    if (checked) {
      setSelectedClassIds(prev => [...prev, classId]);
      // Default weight suggestion: equal split or 100%
      setWeights(prev => ({ ...prev, [classId]: "10" })); 
    } else {
      setSelectedClassIds(prev => prev.filter(id => id !== classId));
      const newWeights = { ...weights };
      delete newWeights[classId];
      setWeights(newWeights);
    }
  };

  const handleWeightChange = (classId: string, value: string) => {
    setWeights(prev => ({ ...prev, [classId]: value }));
  };

  const calculateResults = () => {
    if (selectedClassIds.length === 0) {
      showError("Please select at least one assessment.");
      return;
    }

    // Validate weights
    const parsedWeights: { [id: string]: number } = {};
    let totalWeight = 0;
    
    selectedClassIds.forEach(id => {
      const w = parseFloat(weights[id]);
      if (isNaN(w) || w < 0) {
        parsedWeights[id] = 0;
      } else {
        parsedWeights[id] = w;
        totalWeight += w;
      }
    });

    if (totalWeight === 0) {
      showError("Total weight must be greater than 0.");
      return;
    }

    // Aggregate Data
    const learnerMap: { [name: string]: AggregatedLearner } = {};

    selectedClassIds.forEach(classId => {
      const cls = classes.find(c => c.id === classId);
      if (!cls) return;

      cls.learners.forEach(l => {
        // Normalize name
        const normalizedName = l.name.trim();
        
        if (!learnerMap[normalizedName]) {
          learnerMap[normalizedName] = {
            name: normalizedName,
            marks: {},
            finalMark: 0
          };
        }

        const markVal = parseFloat(l.mark);
        learnerMap[normalizedName].marks[classId] = !isNaN(markVal) ? markVal : null;
      });
    });

    // Calculate Finals
    const results = Object.values(learnerMap).map(learner => {
      let weightedSum = 0;

      selectedClassIds.forEach(classId => {
        const mark = learner.marks[classId];
        const weight = parsedWeights[classId];

        if (mark !== null) {
          weightedSum += mark * weight;
        }
      });
      
      const final = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
      return { ...learner, finalMark: parseFloat(final.toFixed(1)) };
    }).sort((a, b) => a.name.localeCompare(b.name));

    setAggregatedData(results);
    showSuccess(`Calculated results for ${results.length} learners.`);
  };

  // Prepare trend data
  const trendData = useMemo(() => {
    if (selectedClassIds.length === 0) return [];

    // Map selected IDs to class info and sort by creation date (id is timestamp in this app logic)
    const sortedAssessments = selectedClassIds
      .map(id => classes.find(c => c.id === id)!)
      .sort((a, b) => a.id.localeCompare(b.id));

    return sortedAssessments.map(c => {
      const stats = calculateClassStats(c.learners);
      return {
        name: c.className,
        average: stats.average,
        passRate: stats.passRate
      };
    });
  }, [selectedClassIds, classes]);

  const handleExportCSV = () => {
    if (!aggregatedData) return;

    const selectedClassInfos = selectedClassIds.map(id => classes.find(c => c.id === id)!);
    
    // Headers
    let csvContent = "Learner Name";
    selectedClassInfos.forEach(c => {
      csvContent += `,${c.className} (${c.subject}) [${weights[c.id]}%]`;
    });
    csvContent += ",Final Mark,Symbol,Level\n";

    // Rows
    aggregatedData.forEach(l => {
      let row = `"${l.name}"`;
      selectedClassInfos.forEach(c => {
        const m = l.marks[c.id];
        row += `,${m !== null ? m : ''}`;
      });
      
      const symbol = getGradeSymbol(l.finalMark, gradingScheme);
      row += `,${l.finalMark},${symbol?.symbol || '-'},${symbol?.level || '-'}\n`;
      csvContent += row;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `Aggregated_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    if (!aggregatedData) return;
    const doc = new jsPDF();
    const selectedClassInfos = selectedClassIds.map(id => classes.find(c => c.id === id)!);

    // Header
    doc.setFontSize(18);
    doc.text("Aggregated Performance Report", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`${schoolName}`, 14, 26);
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 32);
    if(teacherName) doc.text(`Teacher: ${teacherName}`, 14, 38);

    // Context
    let subHeader = `Included Assessments: `;
    selectedClassInfos.forEach((c, i) => {
        if(i > 0) subHeader += ", ";
        subHeader += `${c.className} (${weights[c.id]}%)`;
    });
    const splitSub = doc.splitTextToSize(subHeader, 180);
    doc.text(splitSub, 14, 46);

    // Table
    const head = [['Name', ...selectedClassInfos.map(c => c.className), 'Final %', 'Sym', 'Lvl']];
    const body = aggregatedData.map(l => {
        const marks = selectedClassInfos.map(c => l.marks[c.id] !== null ? l.marks[c.id] : '-');
        const symbol = getGradeSymbol(l.finalMark, gradingScheme);
        return [
            l.name,
            ...marks,
            l.finalMark,
            symbol?.symbol || '-',
            symbol?.level || '-'
        ];
    });

    autoTable(doc, {
        startY: 55 + (splitSub.length * 5),
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [41, 37, 36] },
        styles: { fontSize: 8 }
    });

    doc.save(`Aggregated_Report.pdf`);
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Aggregate Reports</h1>
        <p className="text-muted-foreground">Combine multiple assessments into a final term or year mark.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Filter Assessments</CardTitle>
              <CardDescription>Narrow down the class list.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Grade</label>
                <Select value={selectedGrade} onValueChange={(v) => { setSelectedGrade(v); setAggregatedData(null); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    {uniqueGrades.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setAggregatedData(null); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Select & Weight</CardTitle>
              <CardDescription>Choose assessments and assign weighting.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                {filteredClasses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No matching classes found.</p>
                ) : (
                    <div className="space-y-4">
                    {filteredClasses.map(cls => (
                        <div key={cls.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/20">
                            <div className="flex items-start gap-2">
                                <Checkbox 
                                    id={`chk-${cls.id}`} 
                                    checked={selectedClassIds.includes(cls.id)}
                                    onCheckedChange={(checked) => handleClassToggle(cls.id, !!checked)}
                                />
                                <div className="grid gap-0.5">
                                    <label htmlFor={`chk-${cls.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {cls.className}
                                    </label>
                                    <span className="text-xs text-muted-foreground">{cls.subject} ({cls.learners.length} learners)</span>
                                </div>
                            </div>
                            
                            {selectedClassIds.includes(cls.id) && (
                                <div className="flex items-center gap-2 ml-6 animate-in slide-in-from-top-2">
                                    <span className="text-xs font-medium w-16">Weight:</span>
                                    <Input 
                                        type="number" 
                                        className="h-7 w-20 text-right" 
                                        value={weights[cls.id] || ""}
                                        onChange={(e) => handleWeightChange(cls.id, e.target.value)}
                                        placeholder="%"
                                    />
                                    <span className="text-xs text-muted-foreground">%</span>
                                </div>
                            )}
                        </div>
                    ))}
                    </div>
                )}
              </ScrollArea>
              
              <div className="mt-4 pt-4 border-t space-y-4">
                 <div className="flex justify-between text-sm">
                    <span>Total Weight:</span>
                    <span className={Object.values(weights).reduce((a,b) => a + (parseFloat(b)||0), 0) !== 100 ? "text-amber-600 font-bold" : "text-green-600 font-bold"}>
                        {Object.values(weights).reduce((a,b) => a + (parseFloat(b)||0), 0)}%
                    </span>
                 </div>
                 <Button className="w-full" onClick={calculateResults} disabled={selectedClassIds.length === 0}>
                    <Calculator className="mr-2 h-4 w-4" /> Calculate Final Marks
                 </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-2 space-y-6">
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
              <CardHeader className="flex flex-row items-center justify-between">
                 <div>
                    <CardTitle>Results Preview</CardTitle>
                    <CardDescription>
                       {aggregatedData ? `Generated for ${aggregatedData.length} learners` : "Select assessments to generate report."}
                    </CardDescription>
                 </div>
                 {aggregatedData && (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleExportCSV}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportPDF}>
                            <Download className="mr-2 h-4 w-4" /> PDF
                        </Button>
                    </div>
                 )}
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                 {aggregatedData ? (
                    <div className="h-full max-h-[600px] overflow-auto border-t">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <TableHead>Learner Name</TableHead>
                                    {selectedClassIds.map(id => {
                                        const c = classes.find(cls => cls.id === id);
                                        return (
                                            <TableHead key={id} className="text-right whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span>{c?.className}</span>
                                                    <span className="text-[10px] text-muted-foreground font-normal">{weights[id]}%</span>
                                                </div>
                                            </TableHead>
                                        )
                                    })}
                                    <TableHead className="text-right font-bold bg-muted/50">Final %</TableHead>
                                    <TableHead className="text-center bg-muted/50">Sym</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {aggregatedData.map((learner, idx) => {
                                    const symbol = getGradeSymbol(learner.finalMark, gradingScheme);
                                    return (
                                        <TableRow key={idx}>
                                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                            <TableCell className="font-medium">{learner.name}</TableCell>
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
                    <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                        <Filter className="h-12 w-12 mb-4 opacity-20" />
                        <p>Configure settings and click Calculate to view results.</p>
                    </div>
                 )}
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;