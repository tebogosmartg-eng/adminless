in JSX">
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
import { HelpCircle, BookOpen, Camera, Settings, FileBarChart, ShieldCheck, Layers, AlertCircle, BadgeCheck, Search } from "lucide-react";
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
        <Button variant="ghost" size="icon" title="Help & Documentation" className="text-white/80 hover:bg-white/10">
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

                <section>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full"><Search className="h-5 w-5 text-amber-600" /></div>
                    <h3 className="font-bold text-lg">Smart Entry Modes</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 mt-2">
                    <div className="border p-3 rounded-lg bg-muted/20">
                        <h4 className="font-bold text-xs uppercase mb-1">Voice Entry</h4>
                        <p className="text-xs text-muted-foreground">Dictate marks hands-free. Say "John 85" and the system will match the learner automatically.</p>
                    </div>
                    <div className="border p-3 rounded-lg bg-muted/20">
                        <h4 className="font-bold text-xs uppercase mb-1">Fraction Parsing</h4>
                        <p className="text-xs text-muted-foreground">Type "17/20" in a mark cell. AdminLess will calculate <strong>85%</strong> for you.</p>
                    </div>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="ai" className="space-y-6 mt-0">
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-full"><Camera className="h-5 w-5 text-pink-600" /></div>
                    <h3 className="font-bold text-lg">Vision Scanning</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Upload images of handwritten paper mark sheets to the <strong>Scan Scripts</strong> page. AI extracts names and scores directly into your digital register.
                  </p>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full"><FileBarChart className="h-5 w-5 text-indigo-600" /></div>
                    <h3 className="font-bold text-lg">Performance Insights</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    In any Class View, go to the <strong>Analysis</strong> tab to see AI-generated trends and correlation between attendance and achievement.
                  </p>
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
                    You can adjust this threshold in <strong>Settings > School Profile</strong>.
                  </p>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full"><ShieldCheck className="h-5 w-5 text-green-600" /></div>
                    <h3 className="font-bold text-lg">Moderation & Audit</h3>
                  </div>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                    <li><strong>10% Rule:</strong> The Evidence Audit tool tracks if you have uploaded scripts for at least 10% of your class roster.</li>
                    <li><strong>Finalization:</strong> Closing a term in Settings locks all marks. This creates a permanent audit trail for departmental review.</li>
                    <li><strong>Roll Forward:</strong> After closing a term, use <strong>Roll Forward</strong> to copy learner lists to the next active term without marks.</li>
                  </ul>
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