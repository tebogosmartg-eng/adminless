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
      <CardHeader className="pb-1.5 pt-3 px-4">
        <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 pb-3 px-4">
        <div className="col-span-2">
           <CreateClassDialog onClassCreate={addClass} />
        </div>
        
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 px-2" asChild>
          <Link to="/scan">
            <Camera className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-medium">Scan Scripts</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 px-2" onClick={onAddNote}>
            <StickyNote className="h-4 w-4 text-orange-500" />
            <span className="text-[10px] font-medium">Quick Note</span>
        </Button>
        
        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 px-2" asChild>
          <Link to="/reports">
            <Upload className="h-4 w-4 text-green-600" />
            <span className="text-[10px] font-medium">Reports</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 px-2" asChild>
            <Link to="/settings">
                <PlusCircle className="h-4 w-4 text-purple-600" />
                <span className="text-[10px] font-medium">Settings</span>
            </Link>
        </Button>
      </CardContent>
    </Card>
  );
};