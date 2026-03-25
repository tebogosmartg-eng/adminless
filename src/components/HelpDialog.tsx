import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  BarChart3,
  Calculator,
  Zap,
  Mic,
  ArrowRight,
  Keyboard,
  MoreHorizontal
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "@/context/SettingsContext";
import { useAcademic } from "@/context/AcademicContext";
import { Badge } from "@/components/ui/badge";

export function HelpDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { atRiskThreshold, gradingScheme } = useSettings();
  const { activeYear, activeTerm } = useAcademic();

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Help & Documentation" className="text-muted-foreground hover:bg-muted">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b bg-muted/30 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              AdminLess Help Center
            </DialogTitle>
            <DialogDescription>
              Actionable guides, shortcuts, and tips to speed up your admin.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <Tabs defaultValue="basics" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-2 sm:px-6 py-2 bg-muted/10 border-b shrink-0">
            <TabsList className="flex w-full h-auto overflow-x-auto no-scrollbar justify-start sm:justify-center flex-nowrap p-1 bg-muted">
              <TabsTrigger value="basics" className="text-xs whitespace-nowrap flex-none sm:flex-1 px-4 py-1.5">Workflow Basics</TabsTrigger>
              <TabsTrigger value="marking" className="text-xs whitespace-nowrap flex-none sm:flex-1 px-4 py-1.5">Speed Marking</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs whitespace-nowrap flex-none sm:flex-1 px-4 py-1.5">AI Tools</TabsTrigger>
              <TabsTrigger value="compliance" className="text-xs whitespace-nowrap flex-none sm:flex-1 px-4 py-1.5">Compliance</TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-6">
              <TabsContent value="basics" className="space-y-6 mt-0">
                <section className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                   <div>
                       <h4 className="text-sm font-bold uppercase text-primary mb-1 flex items-center gap-2">
                          <BadgeCheck className="h-4 w-4" /> Current Active Session
                       </h4>
                       <p className="text-sm font-medium">
                          Working in: <strong>{activeYear?.name || "No Year"}</strong> — <strong>{activeTerm?.name || "No Term"}</strong>
                       </p>
                       <p className="text-xs text-muted-foreground mt-1">
                          All data you capture is securely saved to this specific term.
                       </p>
                   </div>
                   <Button variant="outline" size="sm" onClick={() => handleNavigate('/settings')} className="w-full sm:w-auto">
                       Change Context <ArrowRight className="ml-2 h-3 w-3" />
                   </Button>
                </section>

                <section className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-3 p-4 border rounded-xl bg-card">
                    <h3 className="font-bold flex items-center gap-2">
                        <Layers className="h-4 w-4 text-blue-500" /> Structure Overview
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      AdminLess uses strict scoping to prevent data mixing:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      <li><strong>Years:</strong> High-level containers (e.g., 2024).</li>
                      <li><strong>Terms:</strong> Break the year into 4 periods. Finalising a term locks its data.</li>
                      <li><strong>Classes:</strong> Rosters that belong to a specific term. Use "Roll Forward" to copy them to the next term.</li>
                    </ul>
                  </div>

                  <div className="space-y-3 p-4 border rounded-xl bg-card">
                    <h3 className="font-bold flex items-center gap-2">
                        <Keyboard className="h-4 w-4 text-purple-500" /> Quick Navigation
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Stop clicking around. Use global search to jump straight to any learner's profile across all your classes.
                    </p>
                    <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between border">
                        <span className="text-sm font-medium">Global Search</span>
                        <kbd className="px-2 py-1 bg-background border rounded-md shadow-sm font-mono text-xs font-bold">Cmd/Ctrl + K</kbd>
                    </div>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="marking" className="space-y-6 mt-0">
                <section className="space-y-4">
                  <h3 className="font-bold text-lg border-b pb-2">Marking Speed Hacks</h3>
                  <div className="grid sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl border bg-card space-y-2">
                          <Calculator className="h-6 w-6 text-blue-500" />
                          <h4 className="font-bold text-sm">Smart Fractions</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                              Don't calculate percentages yourself. Type <kbd className="px-1 py-0.5 border rounded bg-muted">15/20</kbd> into any mark cell, hit Enter, and AdminLess instantly converts it to <span className="font-bold text-foreground">75%</span>.
                          </p>
                      </div>
                      <div className="p-4 rounded-xl border bg-card space-y-2">
                          <Zap className="h-6 w-6 text-amber-500" />
                          <h4 className="font-bold text-sm">Rapid Entry Mode</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                              Click the <MoreHorizontal className="inline h-3 w-3" /> on any assessment column header and choose <strong>Rapid Entry</strong> to enter marks one-by-one with full screen focus.
                          </p>
                      </div>
                      <div className="p-4 rounded-xl border bg-card space-y-2">
                          <Mic className="h-6 w-6 text-red-500" />
                          <h4 className="font-bold text-sm">Voice Dictation</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                              Sort your physical scripts, click <strong>Voice Entry</strong>, and simply read out "John Doe 85" to record marks hands-free.
                          </p>
                      </div>
                  </div>
                </section>

                <section className="pt-4">
                  <h3 className="font-bold text-sm mb-3 text-muted-foreground uppercase tracking-widest">Active Grading Symbols</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {gradingScheme.sort((a,b) => b.min - a.min).map(g => (
                        <div key={g.id} className="p-2 border rounded-lg bg-card text-center shadow-sm">
                            <Badge variant="outline" className={g.badgeColor}>{g.symbol}</Badge>
                            <p className="text-[10px] mt-1.5 font-bold text-muted-foreground">{g.min}% - {g.max}%</p>
                        </div>
                    ))}
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="ai" className="space-y-6 mt-0">
                <section>
                  <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
                    AdminLess uses Ethical AI to automate repetitive tasks. You remain in complete control—all AI outputs are drafts awaiting your final approval.
                  </p>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-5 border rounded-xl bg-card hover:border-primary/40 transition-all flex flex-col">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-primary/10 rounded-lg"><Camera className="h-5 w-5 text-primary" /></div>
                        <h4 className="font-bold">Scan Marksheets</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4 flex-1">
                        Take a photo of a handwritten class list or register. The AI will extract the names and instantly build your digital roster.
                      </p>
                      <Button variant="secondary" size="sm" className="w-full font-bold" onClick={() => handleNavigate('/scan')}>
                        Go to Scanner
                      </Button>
                    </div>

                    <div className="p-5 border rounded-xl bg-card hover:border-primary/40 transition-all flex flex-col">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-100 rounded-lg"><FileText className="h-5 w-5 text-purple-600" /></div>
                        <h4 className="font-bold">Automated Extraction</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4 flex-1">
                        Upload photos of marked student scripts. The AI extracts question-by-question scores and populates your grid automatically.
                      </p>
                      <Button variant="secondary" size="sm" className="w-full font-bold" onClick={() => handleNavigate('/scan')}>
                        Try Extraction
                      </Button>
                    </div>

                    <div className="p-5 border rounded-xl bg-card hover:border-primary/40 transition-all flex flex-col">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-amber-100 rounded-lg"><BarChart3 className="h-5 w-5 text-amber-600" /></div>
                        <h4 className="font-bold">Diagnostic Insights</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4 flex-1">
                        Generate DBE-compliant diagnostic reports. The AI spots class-wide weaknesses and suggests pedagogical interventions.
                      </p>
                      <Button variant="secondary" size="sm" className="w-full font-bold" onClick={() => handleNavigate('/classes')}>
                        Open a Class to Analyze
                      </Button>
                    </div>

                    <div className="p-5 border rounded-xl bg-card hover:border-primary/40 transition-all flex flex-col">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-100 rounded-lg"><Book className="h-5 w-5 text-green-600" /></div>
                        <h4 className="font-bold">Teacher File Builder</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4 flex-1">
                        Let the system assemble your ATP, marksheets, moderation samples, and evidence into a single printable PDF portfolio.
                      </p>
                      <Button variant="secondary" size="sm" className="w-full font-bold" onClick={() => handleNavigate('/teacher-file')}>
                        View Teacher File
                      </Button>
                    </div>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-6 mt-0">
                <div className="grid md:grid-cols-2 gap-6">
                    <section className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-xl border border-amber-200 dark:border-amber-900/30 flex flex-col">
                    <h4 className="font-bold uppercase text-amber-700 dark:text-amber-500 mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> At-Risk Identification
                    </h4>
                    <p className="text-sm text-amber-900/80 dark:text-amber-200/80 mb-4 flex-1">
                        Learners scoring below <strong>{atRiskThreshold}%</strong> are automatically flagged in red across all dashboards and reports for required intervention.
                    </p>
                    <Button variant="outline" size="sm" className="bg-white/50 w-full sm:w-fit" onClick={() => handleNavigate('/settings')}>
                        Adjust Threshold
                    </Button>
                    </section>

                    <section className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-200 dark:border-blue-900/30 flex flex-col">
                    <h4 className="font-bold uppercase text-blue-700 dark:text-blue-500 mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> SA-SAMS Integration
                    </h4>
                    <p className="text-sm text-blue-900/80 dark:text-blue-200/80 mb-4 flex-1">
                        You can only export SA-SAMS aligned CSVs once a term is officially <strong>Finalised</strong>. This prevents draft marks from polluting official systems.
                    </p>
                    <Button variant="outline" size="sm" className="bg-white/50 w-full sm:w-fit" onClick={() => handleNavigate('/settings')}>
                        Go to Term Finalisation
                    </Button>
                    </section>
                </div>

                <div className="p-5 border rounded-xl bg-card">
                    <h4 className="font-bold mb-2">Moderation Samples</h4>
                    <p className="text-sm text-muted-foreground">
                        When preparing for HOD moderation, open the <strong>Evidence</strong> tab in any class. AdminLess can automatically select a statistically sound 10% sample (High, Medium, Low performers) for you to upload scripts against.
                    </p>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
          
          <div className="p-4 bg-muted/20 border-t flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-muted-foreground shrink-0">
            <span>AdminLess Intelligence Engine</span>
            <span className="hidden sm:inline">Live System Data Connected</span>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}