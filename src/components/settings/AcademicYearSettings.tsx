import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Lock, Unlock, Plus, AlertCircle } from "lucide-react";
import { useAcademic } from '@/context/AcademicContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const AcademicYearSettings = () => {
  const { years, terms, activeYear, setActiveYear, createYear, updateTerm, toggleTermStatus } = useAcademic();
  const [newYearName, setNewYearName] = useState("");

  const handleCreateYear = async () => {
    if (newYearName.trim()) {
      await createYear(newYearName.trim());
      setNewYearName("");
    }
  };

  const DatePicker = ({ date, onSelect }: { date: string | null, onSelect: (d: Date | undefined) => void }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          size="sm"
          className={cn(
            "w-[130px] justify-start text-left font-normal h-8",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(new Date(date), "dd/MM/yyyy") : <span>Pick date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date ? new Date(date) : undefined}
          onSelect={onSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );

  const totalWeight = useMemo(() => terms.reduce((acc, t) => acc + Number(t.weight), 0), [terms]);
  const isWeightValid = totalWeight === 100;

  return (
    <div className="grid gap-6 md:grid-cols-1">
      <Card>
        <CardHeader>
          <CardTitle>Academic Years</CardTitle>
          <CardDescription>
            Create and manage school years. Ensure term weights sum to 100% for correct year-end reporting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
             <Select value={activeYear?.id} onValueChange={(val) => setActiveYear(years.find(y => y.id === val) || null)}>
                <SelectTrigger className="w-[200px]">
                   <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                   {years.map(y => (
                       <SelectItem key={y.id} value={y.id}>{y.name} {y.closed ? "(Closed)" : ""}</SelectItem>
                   ))}
                </SelectContent>
             </Select>
             
             <div className="flex gap-2 ml-auto">
                 <Input 
                   placeholder="New Year (e.g. 2026)" 
                   value={newYearName}
                   onChange={(e) => setNewYearName(e.target.value)}
                   className="w-[180px]"
                 />
                 <Button onClick={handleCreateYear}>
                    <Plus className="mr-2 h-4 w-4" /> Create
                 </Button>
             </div>
          </div>
          
          {activeYear && (
             <div className="border rounded-md mt-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Term</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Weight (%)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {terms.map(term => (
                            <TableRow key={term.id}>
                                <TableCell className="font-medium">{term.name}</TableCell>
                                <TableCell>
                                    <DatePicker 
                                        date={term.start_date} 
                                        onSelect={(d) => d && updateTerm({ ...term, start_date: d.toISOString() })} 
                                    />
                                </TableCell>
                                <TableCell>
                                    <DatePicker 
                                        date={term.end_date} 
                                        onSelect={(d) => d && updateTerm({ ...term, end_date: d.toISOString() })} 
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        className="w-20 h-8"
                                        value={term.weight}
                                        onChange={(e) => updateTerm({ ...term, weight: parseFloat(e.target.value) })}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Badge variant={term.closed ? "secondary" : "default"} className={term.closed ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : "bg-green-100 text-green-700 hover:bg-green-200"}>
                                        {term.closed ? "Closed" : "Open"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => toggleTermStatus(term.id, !term.closed)}
                                    >
                                        {term.closed ? <Unlock className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                                        {term.closed ? "Re-open" : "Close"}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="p-4 bg-muted/20 flex justify-end items-center gap-2 border-t">
                    <span className="text-sm font-medium">Total Year Weight:</span>
                    <span className={isWeightValid ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                        {totalWeight}%
                    </span>
                    {!isWeightValid && (
                       <Tooltip>
                           <TooltipTrigger><AlertCircle className="h-4 w-4 text-red-500" /></TooltipTrigger>
                           <TooltipContent>Weights must sum to 100%.</TooltipContent>
                       </Tooltip>
                    )}
                </div>
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};