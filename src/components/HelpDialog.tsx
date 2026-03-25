import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  HelpCircle, 
  Settings, 
  Layers, 
  AlertCircle, 
  BadgeCheck,
  Sparkles,
  Camera,
  FileText,
  Book,
  BarChart3
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "@/context/SettingsContext";
import { useAcademic } from "@/context/AcademicContext";
import { Badge } from "@/components/ui/badge";

export function HelpDialog() {
  const { atRiskThreshold, gradingScheme } = useSettings();
  const { activeYear, activeTerm } = useAcademic();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Help & Documentation" className="text-muted-foreground hover:bg-muted">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b bg-muted/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              AdminLess Help Center
            </DialogTitle>
            <DialogDescription>
              Personalized guides for your current configuration.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <Tabs defaultValue="basics" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-2 bg-muted/10 border-b">
            <TabsList className="grid w-full grid-cols-4 h-9">
              <TabsTrigger value="basics" className="text-xs">Basics</TabsTrigger>
              <TabsTrigger value="marking" className="text-xs">Marking</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">AI Tools</TabsTrigger>
              <TabsTrigger value="compliance" className="text-xs">Compliance</TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-6">
              <TabsContent value="basics" className="space-y-6 mt-0">
                <section className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                   <h4 className="text-xs font-bold uppercase text-primary mb-2 flex items-center gap-2">
                      <BadgeCheck className="h-3 w-3" /> Current Active Session
                   </h4>
                   <p className="text-sm font-medium">
                      You are currently working in <strong>{activeYear?.name || "No Year Selected"}</strong> during <strong>{activeTerm?.name || "No Term Selected"}</strong>.
                   </p>
                   <p className="text-[11px] text-muted-foreground mt-1">
                      All new marks, attendance, and notes will be saved into this specific context.
                   </p>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-primary/10 rounded-full"><Settings className="h-5 w-5 text-primary" /></div>
                    <h3 className="font-bold text-lg">Academic Context</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    AdminLess uses strict scoping. This means you will only see data (classes, tasks, alerts) belonging to the year and term selected in the top bar.
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                    <li><strong>Global Search:</strong> Press <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Cmd + K</kbd> to find any learner, even those in different classes.</li>
                    <li><strong>Archiving:</strong> Use the "Archive" button on a class card to hide it from your dashboard without losing historical data.</li>
                  </ul>
                </section>
              </TabsContent>

              <TabsContent value="marking" className="space-y-6 mt-0">
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full"><Layers className="h-5 w-5 text-purple-600" /></div>
                    <h3 className="font-bold text-lg">Your Grading Rules</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Based on your current <strong>Grading Scheme</strong> settings, the system will apply the following symbols:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {gradingScheme.sort((a,b) => b.min - a.min).map(g => (
                        <div key={g.id} className="p-2 border rounded bg-muted/20 text-center">
                            <Badge variant="outline" className={g.badgeColor}>{g.symbol}</Badge>
                            <p className="text-[10px] mt-1 font-bold">{g.min}% - {g.max}%</p>
                        </div>
                    ))}
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="ai" className="space-y-6 mt-0">
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-lg">AI Tools & Automation</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    AdminLess includes several assistive AI tools to help reduce your administrative burden. These tools are always under your control.
                  </p>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Card 1: Scan Marksheet */}
                    <div className="p-4 border rounded-xl bg-card hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Camera className="h-4 w-4 text-primary" />
                        <h4 className="font-bold text-sm">Scan Marksheet</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">Upload photos of handwritten class lists to automatically create your digital roster.</p>
                    </div>

                    {/* Card 2: AI Mark Extraction */}
                    <div className="p-4 border rounded-xl bg-card hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-purple-500" />
                        <h4 className="font-bold text-sm">AI Mark Extraction</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">Extract marks question-by-question from scanned student scripts directly into your marksheet.</p>
                    </div>

                    {/* Card 3: Teacher File Builder */}
                    <div className="p-4 border rounded-xl bg-card hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Book className="h-4 w-4 text-green-500" />
                        <h4 className="font-bold text-sm">Teacher File Builder</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">Automatically assemble your academic data into a formal portfolio ready for moderation.</p>
                    </div>

                    {/* Card 4: Analytics Generator */}
                    <div className="p-4 border rounded-xl bg-card hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-amber-500" />
                        <h4 className="font-bold text-sm">Analytics Generator</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">Generate deep insights, identify at-risk learners, and get intervention strategies automatically.</p>
                    </div>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-6 mt-0">
                <section className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-200 dark:border-amber-900/30">
                  <h4 className="text-xs font-bold uppercase text-amber-700 dark:text-amber-500 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-3 w-3" /> Current At-Risk Rule
                  </h4>
                  <p className="text-sm">
                    Learners scoring below <strong>{atRiskThreshold}%</strong> are currently flagged for intervention.
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    You can adjust this threshold in <strong>Settings {'>'} School Profile</strong>.
                  </p>
                </section>
              </TabsContent>
            </div>
          </ScrollArea>
          
          <div className="p-4 bg-muted/20 border-t flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            <span>AdminLess Intelligence Engine</span>
            <span>Live System Data Connected</span>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}