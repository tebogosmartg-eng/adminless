import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useState } from "react";
import { useAcademic } from "@/context/AcademicContext";
import { importDemoData } from "@/services/demoData";

export const DataManagementSettings = () => {
  const { recalculateAllActiveAverages } = useAcademic();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleLoadDemo = async () => {
    setIsDemoLoading(true);
    try {
        const { yearId, activeTermId } = await importDemoData();
        localStorage.setItem('adminless_active_year_id', yearId);
        localStorage.setItem('adminless_active_term_id', activeTermId);
        await recalculateAllActiveAverages(true);
        showSuccess("Demo data loaded. Redirecting to Dashboard...");
        setTimeout(() => window.location.href = '/', 1500);
    } catch (e: any) {
        showError(e.message || "Failed to load demo data.");
    } finally {
        setIsDemoLoading(false);
    }
  };

  return (
    <div className="space-y-6">
        <Card className="border-primary/20 bg-primary/5 max-w-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Demo Environment
                </CardTitle>
                <CardDescription>Populate your account with demo data to explore all features instantly.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleLoadDemo} disabled={isDemoLoading} className="font-bold">
                    {isDemoLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate Demo Context"}
                </Button>
            </CardContent>
        </Card>
    </div>
  );
};