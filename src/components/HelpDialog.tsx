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
import { HelpCircle, BookOpen, Camera, Settings, FileBarChart, ShieldCheck, Layers, ArrowRightCircle, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function HelpDialog() {
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
              Professional guides for version 3.1 — Less Admin. More Teaching.
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
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-primary/10 rounded-full"><Settings className="h-5 w-5 text-primary" /></div>
                    <h3 className="font-bold text-lg">Academic Context</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    AdminLess is architected around <strong>Academic Years</strong> and <strong>Terms</strong>. All data (marks, attendance, notes) is strictly scoped to your active selection.
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                    <li><strong>Context Bar:</strong> Use the blue bar at the top to quickly see your active session and sync status.</li>
                    <li><strong>Global Search:</strong> Press <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Cmd + K</kbd> anywhere to find students across all your classes.</li>
                    <li><strong>Settings:</strong> Start every year by creating a new cycle in Settings. This keeps your old data archived but accessible.</li>
                  </ul>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><BookOpen className="h-5 w-5 text-blue-600" /></div>
                    <h3 className="font-bold text-lg">Class Management</h3>
                  </div>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                    <li><strong>Roll Forward:</strong> Don't re-type rosters every term. Use the <strong>Roll Forward</strong> tool in Settings to migrate student names from Term 1 to Term 2 instantly.</li>
                    <li><strong>Archiving:</strong> Archive classes to remove them from your active dashboard while preserving their history for end-of-year reports.</li>
                  </ul>
                </section>
              </TabsContent>

              <TabsContent value="marking" className="space-y-6 mt-0">
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full"><Layers className="h-5 w-5 text-purple-600" /></div>
                    <h3 className="font-bold text-lg">Rubric Designer</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    For projects and practicals, use the <strong>Rubric Library</strong> to design qualitative marking grids.
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                    <li>Link a rubric when creating a new assessment.</li>
                    <li>Click the <Layers className="h-3 w-3 inline" /> icon in the marksheet to open the point-and-click marking grid.</li>
                    <li>The system auto-calculates totals and percentages based on your rubric selections.</li>
                  </ul>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full"><Search className="h-5 w-5 text-amber-600" /></div>
                    <h3 className="font-bold text-lg">Smart Entry Modes</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 mt-2">
                    <div className="border p-3 rounded-lg bg-muted/20">
                        <h4 className="font-bold text-xs uppercase mb-1">Voice Entry</h4>
                        <p className="text-xs text-muted-foreground">Dictate marks hands-free. Say "John 85" and the system will match the student and record the score.</p>
                    </div>
                    <div className="border p-3 rounded-lg bg-muted/20">
                        <h4 className="font-bold text-xs uppercase mb-1">Fraction Parsing</h4>
                        <p className="text-xs text-muted-foreground">Type "17/20" directly into any mark cell. AdminLess will automatically calculate the percentage (85%) for you.</p>
                    </div>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="ai" className="space-y-6 mt-0">
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-full"><Camera className="h-5 w-5 text-pink-600" /></div>
                    <h3 className="font-bold text-lg">AI Vision Scanning</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Digitize paper mark sheets in seconds. Take a photo of your handwritten list and upload it to the <strong>Scan Scripts</strong> page. Gemini AI will extract student names and marks into a digital table for review.
                  </p>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full"><FileBarChart className="h-5 w-5 text-indigo-600" /></div>
                    <h3 className="font-bold text-lg">Intelligent Insights</h3>
                  </div>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                    <li><strong>Class Analysis:</strong> Generate a strategic overview identifying strengths, weaknesses, and recommended interventions for your class group.</li>
                    <li><strong>Bulk Comments:</strong> Use AI to generate unique, personalized report card comments based on individual performance and teacher observations.</li>
                  </ul>
                </section>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-6 mt-0">
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full"><ShieldCheck className="h-5 w-5 text-green-600" /></div>
                    <h3 className="font-bold text-lg">Evidence & Audit</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Prepare for departmental moderation with the <strong>Evidence Audit</strong> dashboard.
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                    <li><strong>10% Sample Rule:</strong> The system highlights classes that lack a sufficient moderation sample (10% of scripts).</li>
                    <li><strong>Moderation Assistant:</strong> In Class Details, the AI suggests which Top, Middle, and Low performers should be selected for your sample.</li>
                    <li><strong>Term Finalization:</strong> Closing a term performs a compliance check to ensure all marks are captured and weighting sums to 100%.</li>
                  </ul>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><ArrowRightCircle className="h-5 w-5 text-red-600" /></div>
                    <h3 className="font-bold text-lg">Transitioning Terms</h3>
                  </div>
                  <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
                    <li>Finalize the current term in <strong>Settings</strong> to lock the audit trail.</li>
                    <li>Activate the next term.</li>
                    <li>Use the <strong>Roll Forward</strong> tool to copy your rosters across.</li>
                    <li>The <strong>Year-End Report</strong> will now automatically combine data from both terms.</li>
                  </ol>
                </section>
              </TabsContent>
            </div>
          </ScrollArea>
          
          <div className="p-4 bg-muted/20 border-t flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            <span>AdminLess v3.1 Documentation</span>
            <span>Last Updated: Feb 2024</span>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}