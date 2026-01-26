import { Separator } from "@/components/ui/separator";
import { SchoolProfileSettings } from "@/components/settings/SchoolProfileSettings";
import { GradingSystemSettings } from "@/components/settings/GradingSystemSettings";
import { CommentBankSettings } from "@/components/settings/CommentBankSettings";
import { DataManagementSettings } from "@/components/settings/DataManagementSettings";
import { StandardListsSettings } from "@/components/settings/StandardListsSettings";

const Settings = () => {
  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your application preferences.</p>
      </div>
      
      <Separator />

      <SchoolProfileSettings />
      
      <StandardListsSettings />

      <div className="grid gap-6 md:grid-cols-2">
        <GradingSystemSettings />
        <CommentBankSettings />
      </div>

      <DataManagementSettings />
    </div>
  );
};

export default Settings;