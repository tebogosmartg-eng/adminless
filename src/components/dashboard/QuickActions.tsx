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
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
           <CreateClassDialog onClassCreate={addClass} />
        </div>
        
        <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2" asChild>
          <Link to="/scan">
            <Camera className="h-6 w-6 text-primary" />
            <span className="text-xs">Scan Scripts</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2" onClick={onAddNote}>
            <StickyNote className="h-6 w-6 text-orange-500" />
            <span className="text-xs">Quick Note</span>
        </Button>
        
        <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2" asChild>
          <Link to="/reports">
            <Upload className="h-6 w-6 text-green-600" />
            <span className="text-xs">Reports</span>
          </Link>
        </Button>

        <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2" asChild>
            <Link to="/settings">
                <PlusCircle className="h-6 w-6 text-purple-600" />
                <span className="text-xs">Settings</span>
            </Link>
        </Button>
      </CardContent>
    </Card>
  );
};