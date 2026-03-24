import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Upload, Camera, Loader2, FileText } from "lucide-react";
import Papa from "papaparse";
import { showSuccess, showError } from "@/utils/toast";
import { ClassInfo } from "@/lib/types";
import { useSettings } from "@/context/SettingsContext";
import { useAcademic } from "@/context/AcademicContext";
import { compressImage } from "@/utils/image";
import { scanRosterWithGemini } from "@/services/gemini";

interface CreateClassDialogProps {
  onClassCreate: (classInfo: ClassInfo) => void;
}

export const CreateClassDialog = ({ onClassCreate }: CreateClassDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [learners, setLearners] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const { savedSubjects, savedGrades } = useSettings();
  const { activeYear, activeTerm } = useAcademic();

  const handleSubmit = () => {
    if (grade && subject && className && learners) {
      if (!activeYear || !activeTerm) {
          showError("No active academic session found.");
          return;
      }

      const learnerList = learners.split('\n')
        .filter(name => name.trim() !== '')
        .map(name => ({ name: name.trim(), mark: '' }));

      onClassCreate({
        id: crypto.randomUUID(),
        year_id: activeYear.id,
        term_id: activeTerm.id,
        grade,
        subject,
        className,
        learners: learnerList,
        archived: false,
        notes: ""
      });
      
      // Reset form and close dialog
      setGrade("");
      setSubject("");
      setClassName("");
      setLearners("");
      setIsOpen(false);
    } else {
      showError("Please fill in all fields (Grade, Subject, Class Name, and Learners).");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          let names: string[] = [];
          
          if (results.meta.fields && (results.meta.fields.includes("Name") || results.meta.fields.includes("Learner Name"))) {
             const field = results.meta.fields.includes("Name") ? "Name" : "Learner Name";
             names = (results.data as any[]).map(row => row[field]).filter(n => n);
          } else {
             names = (results.data as any[])
                .map(row => Array.isArray(row) ? row[0] : Object.values(row)[0])
                .filter(n => n && typeof n === 'string' && n.trim().length > 0) as string[];
          }

          if (names.length > 0) {
             const current = learners ? learners.trim() + "\n" : "";
             setLearners(current + names.join("\n"));
             showSuccess(`Imported ${names.length} names from CSV.`);
          } else {
             showError("Could not find names in CSV file.");
          }
          
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
        header: true,
        skipEmptyLines: true
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsScanning(true);
    showSuccess("Analyzing register... This may take a few seconds.");
    
    try {
        const compressedImages = await Promise.all(
            Array.from(files).map(file => compressImage(file))
        );
        
        const result = await scanRosterWithGemini(compressedImages);
        
        if (result && result.learners && result.learners.length > 0) {
            const names = result.learners.map((l: any) => {
                if (typeof l === 'string') return l;
                return `${l.name} ${l.surname || ''}`.trim();
            }).filter((n: string) => n.length > 0);
            
            if (names.length > 0) {
                const current = learners ? learners.trim() + "\n" : "";
                setLearners(current + names.join("\n"));
                showSuccess(`Extracted ${names.length} names from image. Please review them.`);
            } else {
                showError("No valid names found in the extracted data.");
            }
        } else {
            showError("No names detected in the image.");
        }
    } catch (err: any) {
        console.error(err);
        showError(err.message || "Failed to scan register.");
    } finally {
        setIsScanning(false);
        if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Create Class
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a New Class</DialogTitle>
          <DialogDescription>
            Set up your class and instantly populate the register using AI or CSV.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Input 
                id="grade" 
                value={grade} 
                onChange={(e) => setGrade(e.target.value)} 
                placeholder="e.g. Grade 10" 
                list="grades-list"
                disabled={isScanning}
              />
              <datalist id="grades-list">
                {savedGrades.map(g => <option key={g} value={g} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input 
                id="subject" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                placeholder="e.g. Mathematics" 
                list="subjects-list"
                disabled={isScanning}
              />
              <datalist id="subjects-list">
                {savedSubjects.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="className">Class Name</Label>
              <Input 
                id="className" 
                value={className} 
                onChange={(e) => setClassName(e.target.value)} 
                placeholder="e.g. 10A" 
                disabled={isScanning} 
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="mb-3 block text-sm font-bold">Populate Class Register</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <Button 
                    variant="outline" 
                    type="button" 
                    onClick={() => imageInputRef.current?.click()} 
                    disabled={isScanning} 
                    className="h-16 flex flex-col items-center justify-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                >
                    {isScanning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />} 
                    <span className="text-xs font-black uppercase tracking-wider">{isScanning ? "Scanning..." : "Capture from Register"}</span>
                </Button>
                <Button 
                    variant="outline" 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isScanning} 
                    className="h-16 flex flex-col items-center justify-center gap-1 hover:bg-slate-50"
                >
                    <Upload className="h-5 w-5 text-muted-foreground" /> 
                    <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Upload Class List</span>
                </Button>
            </div>
            
            <div className="relative">
                {isScanning && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-md border border-blue-100">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                        <span className="text-xs font-bold text-blue-800">Extracting Names with AI...</span>
                    </div>
                )}
                <Textarea
                  id="learners"
                  value={learners}
                  onChange={(e) => setLearners(e.target.value)}
                  placeholder="Or create manually by typing one name per line..."
                  className="w-full min-h-[150px] resize-y bg-muted/20"
                  disabled={isScanning}
                />
            </div>
            
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv"
                onChange={handleFileUpload}
            />
            <input 
                type="file" 
                ref={imageInputRef} 
                className="hidden" 
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isScanning} className="w-full sm:w-auto">Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={isScanning} className="font-bold w-full sm:w-auto">Create Class & Save Roster</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};