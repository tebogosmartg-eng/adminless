import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Users, StickyNote, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { CreateClassDialog } from "@/components/CreateClassDialog";
import { useClasses } from "@/context/ClassesContext";

interface QuickActionsProps {
  onAddNote: () => void;
}

export const QuickActions = ({ onAddNote }: QuickActionsProps) => {
  const { addClass } = useClasses();

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 pb-4">
        <div className="col-span-2">
           <CreateClassDialog onClassCreate={addClass} />
        </div>
        
        <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1.5" asChild>
          <Link to="/scan">
            <Camera className="h-5 w-5 text-primary" />
            <span className="text-[11px] font-medium">Scan Scripts</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1.5" onClick={onAddNote}>
            <StickyNote className="h-5 w-5 text-orange-500" />
            <span className="text-[11px] font-medium">Quick Note</span>
        </Button>
        
        <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1.5" asChild>
          <Link to="/reports">
            <Upload className="h-5 w-5 text-green-600" />
            <span className="text-[11px] font-medium">Reports</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-16 flex flex-col items-center justify-center gap-1.5" asChild>
            <Link to="/settings">
                <PlusCircle className="h-5 w-5 text-purple-600" />
                <span className="text-[11px] font-medium">Settings</span>
            </Link>
        </Button>
      </CardContent>
    </Card>
  );
};