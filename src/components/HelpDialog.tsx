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
import { HelpCircle, BookOpen, Camera, Settings, FileBarChart } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Help & Documentation">
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>SmaReg Help Center</DialogTitle>
          <DialogDescription>
            Guides and tips to get the most out of your smart register.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="getting-started" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="getting-started">Basics</TabsTrigger>
            <TabsTrigger value="assessments">Marks</TabsTrigger>
            <TabsTrigger value="ai-tools">AI Tools</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 p-4">
            <TabsContent value="getting-started" className="space-y-4 mt-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-primary/10 rounded-full"><Settings className="h-5 w-5 text-primary" /></div>
                <h3 className="font-semibold text-lg">Initial Setup</h3>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li><strong>Settings First:</strong> Go to the Settings page to configure your <strong>Academic Year</strong> and <strong>Terms</strong>. You cannot capture marks without an active term.</li>
                <li><strong>Profile:</strong> Update your School Name and Logo in settings. These appear on all PDF reports.</li>
                <li><strong>Grading Scheme:</strong> Customize the percentage ranges and symbols (A, B, C, etc.) to match your school's policy.</li>
              </ul>
              
              <div className="flex items-center gap-2 mb-2 mt-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><BookOpen className="h-5 w-5 text-blue-600" /></div>
                <h3 className="font-semibold text-lg">Managing Classes</h3>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>Create classes manually or import lists via CSV/Excel.</li>
                <li>Archive old classes to keep your dashboard clean without losing data.</li>
                <li>Use "Class Details" to manage learners, marks, and attendance for a specific class.</li>
              </ul>
            </TabsContent>

            <TabsContent value="assessments" className="space-y-4 mt-0">
              <h3 className="font-semibold text-lg">Capturing Marks</h3>
              <p className="text-sm text-muted-foreground">
                SmaReg uses a term-based assessment system.
              </p>
              
              <div className="grid gap-4 md:grid-cols-2 mt-2">
                <div className="border p-3 rounded-md">
                    <h4 className="font-medium text-sm mb-1">Create Assessments</h4>
                    <p className="text-xs text-muted-foreground">
                        Define assessments (Tests, Exams) with a <strong>Max Mark</strong> and <strong>Weighting</strong>. 
                        Ensure total weighting for a term sums to 100%.
                    </p>
                </div>
                <div className="border p-3 rounded-md">
                    <h4 className="font-medium text-sm mb-1">Enter Scores</h4>
                    <p className="text-xs text-muted-foreground">
                        Enter raw scores (e.g., 25). The system calculates the percentage based on the max mark automatically.
                    </p>
                </div>
              </div>

              <h3 className="font-semibold text-lg mt-4">Smart Features</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li><strong>Voice Entry:</strong> Click the microphone icon to dictate marks (e.g., "John 85").</li>
                <li><strong>Rapid Entry:</strong> Use this mode to quickly type marks for the whole class one-by-one.</li>
                <li><strong>Comments:</strong> Right-click (or long press) a mark cell to add a specific comment (e.g., "Absent").</li>
              </ul>
            </TabsContent>

            <TabsContent value="ai-tools" className="space-y-4 mt-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full"><Camera className="h-5 w-5 text-purple-600" /></div>
                <h3 className="font-semibold text-lg">Scanning Scripts</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Use the <strong>Scan</strong> feature to digitize paper lists.
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
                <li>Take a photo of a class list or mark sheet.</li>
                <li>Upload it to the AI Scanner.</li>
                <li>The AI extracts names and marks automatically.</li>
                <li>Review the data and either <strong>Update an Existing Class</strong> or <strong>Create a New Class</strong>.</li>
              </ol>

              <div className="mt-6 p-3 bg-muted/30 rounded-lg">
                <h4 className="font-medium text-sm mb-1">AI Insights</h4>
                <p className="text-xs text-muted-foreground">
                    In the Class Details view, click "AI Insights" to generate a performance analysis of your class, identifying at-risk learners and suggesting teaching strategies.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="space-y-4 mt-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full"><FileBarChart className="h-5 w-5 text-green-600" /></div>
                <h3 className="font-semibold text-lg">Generating Reports</h3>
              </div>
              
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li><strong>Term Reports:</strong> Generates a summary of all assessments for a specific term across selected classes.</li>
                <li><strong>Year-End Report:</strong> Calculates a final year mark based on the weighted average of all terms.</li>
                <li><strong>PDF Export:</strong> Download professional report cards or class lists directly from the Reports page.</li>
                <li><strong>Data Export:</strong> You can also export raw data to CSV for use in Excel or other systems.</li>
              </ul>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}