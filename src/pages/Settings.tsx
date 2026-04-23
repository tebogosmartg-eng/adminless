import { useLocation, useNavigate } from "react-router-dom";
import { SchoolProfileSettings } from "@/components/settings/SchoolProfileSettings";
import { GradingSystemSettings } from "@/components/settings/GradingSystemSettings";
import { CommentBankSettings } from "@/components/settings/CommentBankSettings";
import { DataManagementSettings } from "@/components/settings/DataManagementSettings";
import { StandardListsSettings } from "@/components/settings/StandardListsSettings";
import { AcademicYearSettings } from "@/components/settings/AcademicYearSettings";
import { TimetableSettings } from "@/components/settings/TimetableSettings";
import { RubricLibrary } from "@/components/settings/RubricLibrary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
    Settings2, 
    CalendarClock, 
    Layers, 
    School, 
    Sparkles,
    ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

const Settings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const highlightId = location.state?.highlightId;
  const isGuided = location.state?.fromOnboarding;

  let defaultTab = "academic";
  if (highlightId === 'subject-config' || highlightId === 'profile-settings') defaultTab = "profile";

  return (
    <div className="space-y-6 pb-20 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your application preferences and academic setup.</p>
        </div>
        {isGuided && (
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="gap-2 border-primary text-primary w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4" /> Back to Checklist
          </Button>
        )}
      </div>
      
      <Tabs defaultValue={defaultTab} className="space-y-6 min-w-0">
        <div className="overflow-x-auto no-scrollbar">
          <TabsList className="bg-muted/50 border p-1 inline-flex h-auto w-max min-w-full sm:min-w-0 flex-nowrap whitespace-nowrap">
            <TabsTrigger value="academic" className="gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                <CalendarClock className="h-4 w-4" /> Academic
            </TabsTrigger>
            <TabsTrigger value="rubrics" className="gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                <Layers className="h-4 w-4" /> Rubric Library
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                <School className="h-4 w-4" /> School Profile
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                <Settings2 className="h-4 w-4" /> Preferences
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">
                <Sparkles className="h-4 w-4" /> Demo Data
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="academic" className="space-y-6 min-w-0">
            <div className={cn(highlightId === 'year-selector' || highlightId === 'term-config' || highlightId === 'finalize-term-btn' || highlightId === 'roll-forward-btn' ? "guide-highlight rounded-lg" : "")}>
                <AcademicYearSettings />
            </div>
            <TimetableSettings />
        </TabsContent>

        <TabsContent value="rubrics" className="min-w-0">
            <RubricLibrary />
        </TabsContent>

        <TabsContent value="profile" className="space-y-6 min-w-0">
            <div className={cn(highlightId === 'profile-settings' ? "guide-highlight rounded-lg" : "")}>
                <SchoolProfileSettings />
            </div>
            <div className={cn(highlightId === 'subject-config' ? "guide-highlight rounded-lg" : "")}>
                <StandardListsSettings />
            </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0">
                <GradingSystemSettings />
                <CommentBankSettings />
            </div>
        </TabsContent>

        <TabsContent value="data" className="space-y-6 min-w-0">
            <DataManagementSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;