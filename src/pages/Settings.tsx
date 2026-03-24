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
    Database,
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
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your application preferences and academic setup.</p>
        </div>
        {isGuided && (
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="gap-2 border-primary text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to Checklist
          </Button>
        )}
      </div>
      
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="bg-muted/50 border p-1">
            <TabsTrigger value="academic" className="gap-2">
                <CalendarClock className="h-4 w-4" /> Academic
            </TabsTrigger>
            <TabsTrigger value="rubrics" className="gap-2">
                <Layers className="h-4 w-4" /> Rubric Library
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
                <School className="h-4 w-4" /> School Profile
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
                <Settings2 className="h-4 w-4" /> Preferences
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2">
                <Database className="h-4 w-4" /> Data & Sync
            </TabsTrigger>
        </TabsList>

        <TabsContent value="academic" className="space-y-6">
            <div className={cn(highlightId === 'year-selector' || highlightId === 'term-config' || highlightId === 'finalize-term-btn' || highlightId === 'roll-forward-btn' ? "guide-highlight rounded-lg" : "")}>
                <AcademicYearSettings />
            </div>
            <TimetableSettings />
        </TabsContent>

        <TabsContent value="rubrics">
            <RubricLibrary />
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
            <div className={cn(highlightId === 'profile-settings' ? "guide-highlight rounded-lg" : "")}>
                <SchoolProfileSettings />
            </div>
            <div className={cn(highlightId === 'subject-config' ? "guide-highlight rounded-lg" : "")}>
                <StandardListsSettings />
            </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <GradingSystemSettings />
                <CommentBankSettings />
            </div>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
            <DataManagementSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;